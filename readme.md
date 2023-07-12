# これは何？
autify シナリオ整理用の更新スクリプトです。

# 仕様
AutifyのAPIを使って、基本的なシナリオ情報を取得してきます。ただし、最終実行情報や関連プランとかは取得できないので、別途スクレイピングで行っています。
  なので、そのうち塞がれるかもしれない！！

# 設定項目
環境変数に以下の内容を設定する必要があります。
```
KEY=autifyのAPIトークン
AUTIFY_PROJECT_ID=autifyのプロジェクトID
AUTIFY_SCRAPING_LOGIN_ID=スクレイピング用のログインID
AUTIFY_SCRAPING_LOGIN_PASSWORD=スクレイピング用のログインパスワード
```

# ビルド方法
```
yarn install
yarn build
```

# デプロイ方法
```
yarn deploy
```

yarn deployにはyarn buildが含まれているので、yarn buildは基本不要です。
ただしyarn deployをする場合は、clasp.jsonのscriptIdを編集する必要があります。
clasp.jsonの最初の要素のscriptIdを書き換えてください
```json
{
  "scriptId": "scriptIdを書き換えてください",
  "rootDir": "dist"
}
```
実際のIdは、スクリプトエディタのURLの末尾になります
```
https://script.google.com/home/projects/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```