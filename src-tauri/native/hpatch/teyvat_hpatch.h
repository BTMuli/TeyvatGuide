#ifndef TEYVAT_HPATCH_H
#define TEYVAT_HPATCH_H

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/* Apply a zstd-compressed HDiffPatch 4.8.0 compressedDiff onto already-open
 * Windows file handles. `patch_handle` may be a larger container; only the
 * `[patch_offset, patch_offset + patch_length)` slice is consumed.
 *
 * Returns 0 on success.
 * 1: invalid arguments
 * 2: failed to read compressedDiff header
 * 3: old/new size does not match the diff header
 * 4: patch_decompress failed
 */
int teyvat_hpatch_zstd(
    void* old_handle,
    uint64_t old_size,
    void* patch_handle,
    uint64_t patch_offset,
    uint64_t patch_length,
    void* out_handle,
    uint64_t expected_new_size);

#ifdef __cplusplus
}
#endif

#endif
