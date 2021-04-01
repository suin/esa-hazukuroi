import { APIGatewayProxyCallback, APIGatewayProxyHandler } from "aws-lambda";
import { createRouter, PostCreate, PostUpdate } from "@suin/esa-webhook-router";
import "source-map-support/register";
import { isValidEnv } from "./env";
import { formatEsaPost } from "./formatEsaPost";
import * as Diff from "diff";
import "colors";

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

    // 過去のリビジョンにロールバックするケースは、自動整形に何らかの問題があるときの可能性があるので、整形対象から除外する
    if (payload.post.message.match(/^Roll back to/)) {
      console.info("ロールバックのための変更は自動整形しない");
      ok();
      return;
    }

    const result = await formatEsaPost({ team, number, token });

    switch (result.type) {
      case "failure":
        console.error(result.error);
        break;
      case "nothing_to_do":
        console.info(`整形する必要がない`, { team, number });
        break;
      case "formatted":
        console.info(`整形に成功`, { team, number });
        const diff = Diff.diffLines(result.before, result.after);
        diff.forEach((part) => {
          const color = part.added ? "green" : part.removed ? "red" : "grey";
          process.stdout.write(part.value[color]);
        });
        console.log();
        break;
    }

    ok();
  };
}
