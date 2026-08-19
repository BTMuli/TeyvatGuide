#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#include <windows.h>

#include "hpatch.cpp"
#include "teyvat_hpatch.h"
#include "zstd.h"

#include <stdint.h>
#include <stdlib.h>
#include <string.h>

using namespace HPatch;

namespace {

struct FileSlice {
  HANDLE handle;
  uint64_t offset;
  uint64_t size;
};

static int io_at(
    HANDLE handle,
    int writing,
    uint64_t abs,
    void* buffer,
    size_t want) {
  unsigned char* bytes = static_cast<unsigned char*>(buffer);
  while (want > 0) {
    DWORD chunk = want > 0x100000 ? 0x100000 : static_cast<DWORD>(want);
    OVERLAPPED ov;
    memset(&ov, 0, sizeof(ov));
    ov.Offset = static_cast<DWORD>(abs);
    ov.OffsetHigh = static_cast<DWORD>(abs >> 32);
    DWORD got = 0;
    BOOL ok = writing ? WriteFile(handle, bytes, chunk, &got, &ov)
                      : ReadFile(handle, bytes, chunk, &got, &ov);
    if (!ok || got != chunk) {
      return 0;
    }
    abs += chunk;
    bytes += chunk;
    want -= chunk;
  }
  return 1;
}

static hpatch_BOOL slice_read(
    const hpatch_TStreamInput* stream,
    hpatch_StreamPos_t pos,
    unsigned char* out_data,
    unsigned char* out_data_end) {
  FileSlice* self = static_cast<FileSlice*>(stream->streamImport);
  size_t want = static_cast<size_t>(out_data_end - out_data);
  if (pos > self->size || want > self->size - pos) {
    return hpatch_FALSE;
  }
  return io_at(self->handle, 0, self->offset + pos, out_data, want) ? hpatch_TRUE
                                                                    : hpatch_FALSE;
}

static hpatch_BOOL slice_write(
    const hpatch_TStreamOutput* stream,
    hpatch_StreamPos_t pos,
    const unsigned char* data,
    const unsigned char* data_end) {
  FileSlice* self = static_cast<FileSlice*>(stream->streamImport);
  size_t want = static_cast<size_t>(data_end - data);
  if (pos > self->size || want > self->size - pos) {
    return hpatch_FALSE;
  }
  return io_at(
             self->handle,
             1,
             self->offset + pos,
             const_cast<unsigned char*>(data),
             want)
             ? hpatch_TRUE
             : hpatch_FALSE;
}

static void input_from_slice(hpatch_TStreamInput* stream, FileSlice* slice) {
  stream->streamImport = slice;
  stream->streamSize = slice->size;
  stream->read = slice_read;
  stream->_private_reserved = 0;
}

static void output_from_slice(hpatch_TStreamOutput* stream, FileSlice* slice) {
  stream->streamImport = slice;
  stream->streamSize = slice->size;
  stream->read_writed = 0;
  stream->write = slice_write;
}

struct ZstdDec {
  const hpatch_TStreamInput* codeStream;
  hpatch_StreamPos_t code_begin;
  hpatch_StreamPos_t code_end;
  ZSTD_inBuffer s_input;
  ZSTD_outBuffer s_output;
  size_t data_begin;
  ZSTD_DStream* s;
  unsigned char buf[1];
};

static hpatch_BOOL zstd_is_can_open(const char* compressType) {
  return (compressType != 0 && strcmp(compressType, "zstd") == 0) ? hpatch_TRUE
                                                                  : hpatch_FALSE;
}

static hpatch_decompressHandle zstd_open(
    hpatch_TDecompress* plugin,
    hpatch_StreamPos_t dataSize,
    const hpatch_TStreamInput* codeStream,
    hpatch_StreamPos_t code_begin,
    hpatch_StreamPos_t code_end) {
  (void)plugin;
  (void)dataSize;
  size_t input_size = ZSTD_DStreamInSize();
  size_t output_size = ZSTD_DStreamOutSize();
  ZstdDec* self = static_cast<ZstdDec*>(malloc(sizeof(ZstdDec) + input_size + output_size));
  if (self == 0) {
    return 0;
  }
  memset(self, 0, sizeof(ZstdDec));
  self->codeStream = codeStream;
  self->code_begin = code_begin;
  self->code_end = code_end;
  self->s_input.src = self->buf;
  self->s_input.size = input_size;
  self->s_input.pos = input_size;
  self->s_output.dst = self->buf + input_size;
  self->s_output.size = output_size;
  self->s_output.pos = 0;
  self->data_begin = 0;
  self->s = ZSTD_createDStream();
  if (self->s == 0) {
    free(self);
    return 0;
  }
  if (ZSTD_isError(ZSTD_initDStream(self->s))) {
    ZSTD_freeDStream(self->s);
    free(self);
    return 0;
  }
  (void)ZSTD_DCtx_setParameter(self->s, ZSTD_d_windowLogMax, 30);
  return self;
}

static hpatch_BOOL zstd_close(
    hpatch_TDecompress* plugin,
    hpatch_decompressHandle handle) {
  (void)plugin;
  ZstdDec* self = static_cast<ZstdDec*>(handle);
  if (self == 0) {
    return hpatch_TRUE;
  }
  ZSTD_freeDStream(self->s);
  free(self);
  return hpatch_TRUE;
}

static hpatch_BOOL zstd_decompress_part(
    hpatch_decompressHandle handle,
    unsigned char* out_part_data,
    unsigned char* out_part_data_end) {
  ZstdDec* self = static_cast<ZstdDec*>(handle);
  while (out_part_data < out_part_data_end) {
    size_t dataLen = self->s_output.pos - self->data_begin;
    if (dataLen > 0) {
      if (dataLen > static_cast<size_t>(out_part_data_end - out_part_data)) {
        dataLen = static_cast<size_t>(out_part_data_end - out_part_data);
      }
      memcpy(
          out_part_data,
          static_cast<unsigned char*>(self->s_output.dst) + self->data_begin,
          dataLen);
      out_part_data += dataLen;
      self->data_begin += dataLen;
    } else {
      if (self->s_input.pos == self->s_input.size) {
        self->s_input.pos = 0;
        if (self->s_input.size > self->code_end - self->code_begin) {
          self->s_input.size = static_cast<size_t>(self->code_end - self->code_begin);
        }
        if (self->s_input.size > 0) {
          if (!self->codeStream->read(
                  self->codeStream,
                  self->code_begin,
                  static_cast<unsigned char*>(const_cast<void*>(self->s_input.src)),
                  static_cast<unsigned char*>(const_cast<void*>(self->s_input.src))
                      + self->s_input.size)) {
            return hpatch_FALSE;
          }
          self->code_begin += self->s_input.size;
        }
      }
      self->s_output.pos = 0;
      self->data_begin = 0;
      size_t ret = ZSTD_decompressStream(self->s, &self->s_output, &self->s_input);
      if (ZSTD_isError(ret) || self->s_output.pos == self->data_begin) {
        return hpatch_FALSE;
      }
    }
  }
  return hpatch_TRUE;
}

}  // namespace

extern "C" int teyvat_hpatch_zstd(
    void* old_handle,
    uint64_t old_size,
    void* patch_handle,
    uint64_t patch_offset,
    uint64_t patch_length,
    void* out_handle,
    uint64_t expected_new_size) {
  if (old_handle == 0 || patch_handle == 0 || out_handle == 0 || patch_length == 0
      || expected_new_size == 0) {
    return 1;
  }

  FileSlice old_slice = {static_cast<HANDLE>(old_handle), 0, old_size};
  FileSlice diff_slice = {
      static_cast<HANDLE>(patch_handle),
      patch_offset,
      patch_length};
  FileSlice out_slice = {static_cast<HANDLE>(out_handle), 0, expected_new_size};

  hpatch_TStreamInput old_stream;
  hpatch_TStreamInput diff_stream;
  hpatch_TStreamOutput out_stream;
  input_from_slice(&old_stream, &old_slice);
  input_from_slice(&diff_stream, &diff_slice);
  output_from_slice(&out_stream, &out_slice);

  hpatch_compressedDiffInfo info;
  memset(&info, 0, sizeof(info));
  if (!getCompressedDiffInfo(&info, &diff_stream)) {
    return 2;
  }
  if (info.newDataSize != expected_new_size || info.oldDataSize != old_size) {
    return 3;
  }

  hpatch_TDecompress plugin;
  memset(&plugin, 0, sizeof(plugin));
  plugin.is_can_open = zstd_is_can_open;
  plugin.open = zstd_open;
  plugin.close = zstd_close;
  plugin.decompress_part = zstd_decompress_part;
  plugin.reset_code = 0;
  plugin.decError = hpatch_dec_ok;

  return patch_decompress(&out_stream, &old_stream, &diff_stream, &plugin) ? 0 : 4;
}
