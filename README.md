# HitConfirm Lab

HitConfirm Lab は、格闘ゲームのヒット確認や状況確認をイメージしたブラウザ用トレーニングアプリです。

単純に色が変わった瞬間へ反応する反射神経測定ではありません。デフォルト色から別の色に変化したあと、その色が「押すべき色」なら入力し、「押してはいけない色」なら我慢します。見てから判断して、正しい状況だけ反応する練習を目的にしています。

## 遊び方

- 中央パネルをクリックまたはタップ
- Space キー
- Enter キー

色が変わる前に押すとフライングです。成功対象色で押せた場合のみ、`performance.now()` を使って反応時間を記録します。統計は `localStorage` に保存されます。

## モード

- Basic Mode: 成功対象色は 1 色、失敗対象色は 3 色
- Random Mode: ラウンドごとに成功対象色と失敗対象色が変化
- Speed Mode: 制限時間が短い速度重視モード

## ローカル起動

```bash
npm install
npm run dev
```

起動後は `http://localhost:5173/` を開いてください。

## ビルド

```bash
npm run build
```

ビルド成果物は `dist/` に生成されます。

## GitHub Pages で公開する

このプロジェクトは GitHub Pages で公開できる静的 Web アプリです。リポジトリ名は `hit-confirm-lab` を想定しているため、`vite.config.ts` の production 用 `base` は次のようになっています。

```ts
base: process.env.NODE_ENV === 'production' ? '/hit-confirm-lab/' : '/',
```

リポジトリ名を変えた場合は、production 側の `'/hit-confirm-lab/'` を `/<your-repository-name>/` に変更してください。ローカル開発時は `/` を使うため、`npm run dev` の標準 URL でそのまま動きます。

GitHub Actions で自動デプロイする場合は、GitHub のリポジトリ設定で Pages の Source を `GitHub Actions` に設定してください。その後、`main` ブランチへ push すると `.github/workflows/deploy.yml` がビルドして Pages へ公開します。

公開後は GitHub Pages の URL を友人に共有すれば、環境構築なしでブラウザだけで遊べます。
