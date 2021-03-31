# @suin/esa-hazukuroi

esa.ioで投稿が保存されたときに自動的にMarkdownの書式をキレイに整形するウェブサービスです✨

## 特徴

### Markdownのベストプラクティスを反映した自動整形

Prettierを用いてMarkdownを整形するので、ベストプラクティスが組み込まれた形のMarkdownに自動的にフォーマットされます。

各個人の微妙な表記ゆれを無くし、統一感のあるドキュメントに自動整形します。Markdownには同じ意味でも複数の書き方があります。たとえば、リストは`*`と`-`のどちらでも表現できます。そのため、Markdownを書く個人によって表記ゆれが発生することがあります。このツールはそうした表記ゆれを統一し、一体感のあるドキュメントにしたてます。

### esa.ioのベストプラクティスに基づいた自動整形

esa.ioでは投稿同士をリンクするとき、絶対URLではなく相対URLを使うことが推奨されています。もしMarkdown内に絶対URLが見つかった場合、このツールは相対URLに自動的に書き換えます。

### サーバーレス

このツールはNetlify Functionsなどのサーバーレスアーキテクチャで動作するように設計されています。したがって、デプロイ後もサーバーを保守する手間がありません。

### 設定いらずで利用可能

このツールを使うにあたって、整形ルールを決めるような面倒な手順がないよう、整形ルールの設定があえてできないような独善的なものになっています。

## インストール

> TODO

## 使い方

> TODO

## 開発に参加する

パッケージマネージャーはPNPMをお使いください。

### 開発環境の起動

このリポジトリをクローンしたら、`serve`コマンドで開発サーバーを起動してください:

```shell
export ESA_API_TOKEN='***'
pnpm serve
```

サーバー起動には1〜2分程度かかります。Prettierを含めたビルドが重いためです。

### 開発環境にリクエスト

開発環境にHTTPリクエストを投げるには、Httpieを使うのが簡単です:

```shell
cat tests/post_create.json | http -v localhost:9000/esaHazukuroi
```

### 内部構造を知る

Markdownの整形処理は、本パッケージではなく[@suin/esa-markdown-format]が行っています。本パッケージは[@suin/esa-markdown-format]をHTTPで呼び出せるようにするラッパーです。Markdownの整形の問題を解決したい場合は、[@suin/esa-markdown-format]のコードを御覧ください。

[@suin/esa-markdown-format]: https://github.com/suin/esa-markdown-format
