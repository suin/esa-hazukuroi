import { createClient, Post } from "@suin/esa-api";
import format from "@suin/esa-markdown-format";

/**
 * esaの投稿を整形する
 */
export async function formatEsaPost({
  team,
  number,
  token,
  updateMessage = "Markdownを整形",
  updateAsEsaBot = true,
}: Options): Promise<Result> {
  const api = createClient({ team, token });
  let post: Post | undefined;

  try {
    post = (await api.getPost(number)).post;
  } catch (e) {
    e.message = `Failed to get a post: ${e.message}`;
    return { type: "failure", error: e };
  }

  if (typeof post !== "object" || post === null) {
    return { type: "failure", error: new Error(`Post not found: ${number}`) };
  }

  const originalMarkdownText = post.body_md;
  let formattedMarkdownText: string;
  try {
    formattedMarkdownText = format(originalMarkdownText, { team });
  } catch (e) {
    e.message = `Failed to format Markdown: ${e.message}`;
    return { type: "failure", error: e };
  }

  if (originalMarkdownText === formattedMarkdownText) {
    return { type: "nothing_to_do" };
  }

  try {
    await api.updatePost(number, {
      body_md: formattedMarkdownText,
      ...(updateAsEsaBot ? { updated_by: "esa_bot" } : {}),
      message: updateMessage,
      original_revision: {
        body_md: originalMarkdownText,
        number: post.revision_number,
        user: post.updated_by.screen_name,
      },
    });
  } catch (e) {
    e.message = `Failed to save a post: ${e.message}`;
    return { type: "failure", error: e };
  }

  return {
    type: "formatted",
    before: originalMarkdownText,
    after: formattedMarkdownText,
  };
}

export type Options = {
  /**
   * esaチーム名
   */
  readonly team: string;
  /**
   * 整形を施す投稿のID
   */
  readonly number: number;
  /**
   * esa APIのアクセストークン
   */
  readonly token: string;
  /**
   * 整形更新時のメッセージ
   */
  readonly updateMessage?: string;
  /**
   * 更新者をesa_botにするかどうか
   *
   * trueをセットするとesa_botとして投稿を更新するようになります。trueをセットするにはチームのOwnerでなければなりません。
   */
  readonly updateAsEsaBot?: boolean;
};

/**
 * 整形結果
 */
export type Result = Failure | NothingToDo | Formatted;

/**
 * 整形に失敗
 */
type Failure = {
  readonly type: "failure";
  readonly error: Error;
};

/**
 * 整形する必要がない
 */
type NothingToDo = {
  readonly type: "nothing_to_do";
};

/**
 * 整形に成功
 */
type Formatted = {
  readonly type: "formatted";
  readonly before: string;
  readonly after: string;
};
