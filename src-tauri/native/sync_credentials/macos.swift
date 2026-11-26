// 在 macOS 上使用 Secure Enclave P-256 密钥与 CryptoKit HPKE 保护 WebDAV 凭据。
// @since Beta v0.14.2

import CryptoKit
import Foundation
import LocalAuthentication
import Security

// 信封：版本、密钥封装长度（u16 大端）、密钥封装、HPKE 封装公钥、密文和标签。前四项是 AAD。
private let version: UInt8 = 1
private let headerLength = 3
private let encapsulatedKeyLength = 65 // RFC 9180 的未压缩 P-256 公钥。
private let tagLength = 16
private let maxWrappedKeyLength = 2048
private let maxPlaintextLength = 4128
private let maxCiphertextLength = 8192
private let info = Data("TeyvatGuide WebDAV credential macOS HPKE v1".utf8)

/// 不向 Rust 暴露系统错误的正文。
/// @since Beta v0.14.2
private enum CredentialFailure: Int32, Error {
    case unavailable = 1
    case failed = 3
}

/// 锁定或要求额外认证时失败，不弹出 Touch ID 或密码提示。
/// @since Beta v0.14.2
private func noninteractiveContext() -> LAContext {
    let context = LAContext()
    context.interactionNotAllowed = true
    return context
}

/// 只创建 Secure Enclave 密钥；其 dataRepresentation 是同一隔区才能打开的密钥封装。
/// @since Beta v0.14.2
@available(macOS 14.0, *)
private func seal(_ plaintext: Data) throws -> Data {
    guard let access = SecAccessControlCreateWithFlags(
        nil, kSecAttrAccessibleWhenUnlockedThisDeviceOnly, .privateKeyUsage, nil
    ) else {
        throw CredentialFailure.unavailable
    }
    let key: SecureEnclave.P256.KeyAgreement.PrivateKey
    do {
        key = try SecureEnclave.P256.KeyAgreement.PrivateKey(
            accessControl: access, authenticationContext: noninteractiveContext()
        )
    } catch {
        throw CredentialFailure.unavailable
    }
    let wrappedKey = key.dataRepresentation
    guard !wrappedKey.isEmpty, wrappedKey.count <= maxWrappedKeyLength else {
        throw CredentialFailure.failed
    }

    var sender = try HPKE.Sender(
        recipientKey: key.publicKey, ciphersuite: .P256_SHA256_AES_GCM_256, info: info
    )
    guard sender.encapsulatedKey.count == encapsulatedKeyLength else {
        throw CredentialFailure.failed
    }
    var envelope = Data([version, UInt8(wrappedKey.count >> 8), UInt8(wrappedKey.count & 0xff)])
    envelope.append(wrappedKey)
    envelope.append(sender.encapsulatedKey)
    let ciphertext = try sender.seal(plaintext, authenticating: envelope)
    envelope.append(ciphertext)
    return envelope
}

/// 解析有界信封，只从封装重新打开原 Secure Enclave 密钥；不创建替换密钥。
/// @since Beta v0.14.2
@available(macOS 14.0, *)
private func open(_ envelope: Data) throws -> Data {
    guard envelope.count > headerLength + encapsulatedKeyLength + tagLength,
        envelope[0] == version
    else {
        throw CredentialFailure.failed
    }
    let wrappedKeyLength = Int(envelope[1]) << 8 | Int(envelope[2])
    let encapsulatedKeyStart = headerLength + wrappedKeyLength
    let ciphertextStart = encapsulatedKeyStart + encapsulatedKeyLength
    let payloadLength = envelope.count - ciphertextStart - tagLength
    guard (1...maxWrappedKeyLength).contains(wrappedKeyLength),
        (1...maxPlaintextLength).contains(payloadLength)
    else {
        throw CredentialFailure.failed
    }

    let key = try SecureEnclave.P256.KeyAgreement.PrivateKey(
        dataRepresentation: envelope.subdata(in: headerLength..<encapsulatedKeyStart),
        authenticationContext: noninteractiveContext()
    )
    var recipient = try HPKE.Recipient(
        privateKey: key, ciphersuite: .P256_SHA256_AES_GCM_256, info: info,
        encapsulatedKey: envelope.subdata(in: encapsulatedKeyStart..<ciphertextStart)
    )
    return try recipient.open(
        envelope.suffix(from: ciphertextStart), authenticating: envelope.prefix(ciphertextStart)
    )
}

/// 用不落盘的合成数据验证此进程实际能保护并恢复数据。
/// @since Beta v0.14.2
@_cdecl("tg_sync_macos_credential_available")
public func credentialAvailable() -> Int32 {
    autoreleasepool {
        guard #available(macOS 14.0, *), SecureEnclave.isAvailable else { return 0 }
        do {
            let sample = Data([0])
            return try open(seal(sample)) == sample ? 1 : 0
        } catch {
            return 0
        }
    }
}

/// 只在操作成功后向调用者缓冲区写入结果；解密输出在返回前尽力擦除 Swift 副本。
/// @since Beta v0.14.2
private func transform(
    _ input: UnsafePointer<UInt8>?, _ inputLength: Int, _ inputLimit: Int,
    _ output: UnsafeMutablePointer<UInt8>?, _ outputCapacity: Int, _ outputLength: UnsafeMutablePointer<Int>?,
    wipeResult: Bool, operation: (Data) throws -> Data
) -> Int32 {
    guard let outputLength else { return CredentialFailure.failed.rawValue }
    outputLength.pointee = 0
    guard let input, (1...inputLimit).contains(inputLength), let output, outputCapacity > 0 else {
        return CredentialFailure.failed.rawValue
    }
    do {
        // 仅在同步操作期间借用调用方的只读缓冲区，不另行保存输入明文。
        let data = Data(
            bytesNoCopy: UnsafeMutableRawPointer(mutating: input), count: inputLength, deallocator: .none
        )
        var result = try operation(data)
        defer {
            if wipeResult { result.resetBytes(in: result.startIndex..<result.endIndex) }
        }
        guard result.count > 0, result.count <= outputCapacity else {
            return CredentialFailure.failed.rawValue
        }
        result.copyBytes(to: output, count: result.count)
        outputLength.pointee = result.count
        return 0
    } catch let error as CredentialFailure {
        return error.rawValue
    } catch {
        return CredentialFailure.failed.rawValue
    }
}

/// Rust 调用入口：只使用硬件封装密钥，旧系统不降级。
/// @since Beta v0.14.2
@_cdecl("tg_sync_macos_credential_seal")
public func credentialSeal(
    _ input: UnsafePointer<UInt8>?, _ inputLength: Int,
    _ output: UnsafeMutablePointer<UInt8>?, _ outputCapacity: Int, _ outputLength: UnsafeMutablePointer<Int>?
) -> Int32 {
    autoreleasepool {
        guard #available(macOS 14.0, *), SecureEnclave.isAvailable else {
            return CredentialFailure.unavailable.rawValue
        }
        return transform(
            input, inputLength, maxPlaintextLength, output, outputCapacity, outputLength,
            wipeResult: false, operation: seal
        )
    }
}

/// Rust 调用入口：持有原 Secure Enclave 密钥才能打开密文。
/// @since Beta v0.14.2
@_cdecl("tg_sync_macos_credential_open")
public func credentialOpen(
    _ input: UnsafePointer<UInt8>?, _ inputLength: Int,
    _ output: UnsafeMutablePointer<UInt8>?, _ outputCapacity: Int, _ outputLength: UnsafeMutablePointer<Int>?
) -> Int32 {
    autoreleasepool {
        guard #available(macOS 14.0, *), SecureEnclave.isAvailable else {
            return CredentialFailure.unavailable.rawValue
        }
        return transform(
            input, inputLength, maxCiphertextLength, output, outputCapacity, outputLength,
            wipeResult: true, operation: open
        )
    }
}
