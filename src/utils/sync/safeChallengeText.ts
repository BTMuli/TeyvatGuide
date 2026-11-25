/**
 * 高难挑战记录的安全文本解析
 * @since Beta v0.14.2
 */

/**
 * 只包含文本和受限颜色的展示片段
 * @since Beta v0.14.2
 */
export type SafeChallengeTextPart = {
  text: string;
  color: string | undefined;
};

/**
 * 将游戏颜色标记和换行解析为纯文本片段，不解析任意 HTML 或链接。
 * @since Beta v0.14.2
 * @param input - 不可信的挑战描述
 * @returns 可由 Vue 文本插值安全展示的片段
 */
export function parseSafeChallengeText(input: string): Array<SafeChallengeTextPart> {
  // 游戏词条仅保留可见文字，不创建链接、HTML、tooltip 或可执行行为。
  const textInput = input.replace(/\{LINK#[a-z0-9]{1,32}\}([\s\S]*?)\{\/LINK\}/gi, "$1");
  const parts: Array<SafeChallengeTextPart> = [];
  const colors: Array<string> = [];
  const buffer: Array<string> = [];
  const tokens =
    /<color=(#[0-9a-f]{6}(?:[0-9a-f]{2})?)>|<\/color>|<br\s*\/?>|\\r\\n|\\n|\r\n|\r|\n/gi;
  let offset = 0;

  /**
   * 将当前颜色下的文本写入结果
   * @since Beta v0.14.2
   */
  function flush(): void {
    const text = buffer.join("");
    buffer.length = 0;
    if (text === "") return;
    parts.push({ text, color: colors.at(-1) });
  }

  for (const match of textInput.matchAll(tokens)) {
    buffer.push(textInput.slice(offset, match.index));
    const token = match[0];
    if (match[1] !== undefined) {
      flush();
      colors.push(match[1]);
    } else if (token.toLowerCase() === "</color>") {
      if (colors.length > 0) {
        flush();
        colors.pop();
      } else {
        buffer.push(token);
      }
    } else {
      buffer.push("\n");
    }
    offset = match.index + token.length;
  }
  buffer.push(textInput.slice(offset));
  flush();
  return parts;
}
