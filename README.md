# まなびフレンズ（kids-study-app）

親のスマホにインストールして子どもに渡す、キャラクターと一緒に遊びながら学べる学習アプリ（PWA）です。算数・英語・ことば（文字・漢字）・考える力（論理・観察）を養います。

- 本番：https://japanesehata-cpu.github.io/kids-study-app/
- 対象：スマートフォンの縦画面（ホーム画面に追加して使う）

## ドキュメント
仕様・設計は `docs/` の6ファイルが正です。実装より先にこちらを読んでください。

| ファイル | 内容 |
|---|---|
| [product-requirements.md](docs/product-requirements.md) | なぜ・誰のために・何を作るか |
| [functional-design.md](docs/functional-design.md) | 画面・機能の振る舞い・データ |
| [architecture.md](docs/architecture.md) | 技術スタック・構成・設計判断 |
| [repository-structure.md](docs/repository-structure.md) | ディレクトリと配置・命名のルール |
| [development-guidelines.md](docs/development-guidelines.md) | 開発の手順と規約 |
| [glossary.md](docs/glossary.md) | 用語 |

## 開発
```bash
npm install
npm run dev      # http://localhost:5173/kids-study-app/
npm run lint
npm test
npm run build
```

`main` に push すると、GitHub Actions がビルドして GitHub Pages に公開します。素材（画像・音声）の作り直しは [development-guidelines.md](docs/development-guidelines.md) を参照してください。
