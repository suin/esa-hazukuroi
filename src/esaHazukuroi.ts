import { APIGatewayProxyCallback, APIGatewayProxyHandler } from "aws-lambda";
import { createRouter, PostCreate, PostUpdate } from "@suin/esa-webhook-router";
import "source-map-support/register";
import { isValidEnv } from "./env";
import { formatEsaPost } from "./formatEsaPost";

export const handler: APIGatewayProxyHandler = (event, _, callback) => {
  const errors: string[] = [];
  if (!isValidEnv(process.env, errors)) {
    throw new Error(errors.join(" "));
  }
  const { ESA_API_TOKEN, ESA_WEBHOOK_SECRET } = process.env;
  const payloadHandler = createPayloadHandler(callback, ESA_API_TOKEN);
  const router = createRouter({ secret: ESA_WEBHOOK_SECRET });
  router.on("post_create", payloadHandler).on("post_update", payloadHandler);
  try {
    router.route(event);
  } catch (e) {
    // エラー処理
    callback(null, {
      statusCode: 400,
      headers: { "content-type": "text/plain" },
      body: e.message,
    });
  }
};

function createPayloadHandler(
  callback: APIGatewayProxyCallback,
  token: string
) {
  const ok = () => {
    callback(null, {
      statusCode: 200,
      headers: { "content-type": "text/plain" },
      body: "OK",
    });
  };

  return async function payloadHandler(payload: PostCreate | PostUpdate) {
    const team = payload.team.name;
    const number = payload.post.number;

    // Webhook接続時のテストデータを無視する
    if (team === "docs" && number === 2) {
      ok();
      return;
    }

    const message = payload.post.message;

    // 過去のリビジョンにロールバックするケースは、自動整形に何らかの問題があるときの可能性があるので、整形対象から除外する
    if (message.match(/^Roll back to/)) {
      console.info("ロールバックのための変更は自動整形しない");
      ok();
      return;
    }

    // 意図的に整形対象から除外したいときのために
    if (message.match(/\[(noformat|no-format|no_format|no format|整形不要)]/)) {
      console.log("明示的にな整形不要指示");
      ok();
      return;
    }

    let updateMessage = "Markdownを整形しました。";
    // 整形前の変更が通知不要の場合、整形の変更も通知したくないことが多いので
    if (message.match(/\[skip notice]/)) {
      updateMessage += " [skip notice]";
    }

    const result = await formatEsaPost({ team, number, token, updateMessage });

    switch (result.type) {
      case "failure":
        console.error(result.error);
        break;
      case "nothing_to_do":
        console.info(`整形する必要がない`, { team, number });
        break;
      case "formatted":
        console.info(`整形に成功`, { team, number });
        break;
    }

    ok();
  };
}
