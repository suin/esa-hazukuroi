import { APIGatewayProxyCallback, APIGatewayProxyHandler } from "aws-lambda";
import { createRouter, PostCreate, PostUpdate } from "@suin/esa-webhook-router";
import "source-map-support/register";
import { isValidEnv } from "./env";
import { createClient } from "@suin/esa-api";
import format from "@suin/esa-markdown-format";

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
  return async function payloadHandler(payload: PostCreate | PostUpdate) {
    const team = payload.team.name;
    const number = payload.post.number;
    const api = createClient({ team, token });

    // Webhook接続時のテストデータを無視する
    if (team === "docs" && number === 2) {
      callback(null, {
        statusCode: 200,
        headers: { "content-type": "text/plain" },
        body: "OK",
      });
      return;
    }

    // 過去のリビジョンにロールバックするケースは、自動整形に何らかの問題があるときの可能性があるので、整形対象から除外する
    if (payload.post.message.match(/^Roll back to/)) {
      console.log("ロールバックのための変更は自動整形しない");
      callback(null, {
        statusCode: 200,
        headers: { "content-type": "text/plain" },
        body: "OK",
      });
      return;
    }

    console.log({ team, number });
    // todo: error handling
    const { post } = await api.getPost(number);
    console.log({ post });
    if (post) {
      const clean = format(post.body_md, { team });
      if (clean !== post.body_md) {
        console.log({ clean });
        // todo: error handling
        await api.updatePost(number, {
          body_md: clean,
          updated_by: "esa_bot",
          message: "Markdownを整形",
          original_revision: {
            body_md: post.body_md,
            number: post.revision_number,
            user: post.updated_by.screen_name,
          },
        });
      } else {
        console.log("整形の必要がない");
      }
    }

    callback(null, {
      statusCode: 200,
      headers: { "content-type": "text/plain" },
      body: "OK",
    });
  };
}
