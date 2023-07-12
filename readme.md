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