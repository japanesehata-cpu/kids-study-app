# リポジトリ構造

前提：[architecture.md](./architecture.md) の構成要素に対応する。

## 1. ディレクトリツリー
```
.
├── docs/                    # 永続的ドキュメント（本書を含む6種）
├── .github/workflows/       # GitHub Actions（main への push で GitHub Pages へ公開）
├── index.html               # アプリの HTML の入口
├── public/                  # ビルドでそのまま配信する静的素材
│   ├── audio/               # 事前に作った読み上げ音声（.wav）
│   ├── images/
│   │   ├── characters/      # 案内キャラクターの立ち絵とまばたき差分
│   │   ├── words/           # えいたんご・かぞえる などの単語の絵
│   │   ├── spot/<テーマ>/   # まちがいさがしの背景と物の画像、その違い（色・部分・背景）
│   │   └── rewards/         # ごほうび演出の画像
│   ├── fonts/               # 自前で配信するフォント（使う字だけに絞ったもの）とそのライセンス
│   └── pwa-icon.png         # ホーム画面のアイコン
├── scripts/                 # 開発時だけ使う素材の生成・検査スクリプトと、その設定 JSON
└── src/
    ├── main.tsx             # 起動処理
    ├── App.tsx              # 画面の切替と「もどる」の履歴、学習記録の読み込み・保存
    ├── index.css            # ページ全体の基本スタイル
    ├── screens/             # 画面（1画面1ファイル）
    ├── components/          # 画面をまたいで使う表示部品
    │   ├── characters/      # 案内キャラクターの表示と設定
    │   └── __tests__/
    ├── domain/              # 出題範囲のデータ、問題の生成、採点・レベルアップ・復習
    │   ├── questionGenerators/  # カテゴリごとの問題の生成（1カテゴリ1ファイル）
    │   └── __tests__/
    ├── lib/                 # ブラウザの機能を包む共通処理（音・読み上げ・保存・乱数など）
    │   └── __tests__/
    ├── i18n/                # 表示文字列（日本語・英語）と言語の切替
    ├── styles/              # テーマ（色・大きさ）と共通の見た目
    └── assets/              # （現在は空。画像は public/ に置く）
```

`dist/`（ビルド結果）と `node_modules/` は Git に含めない。

## 2. 各ディレクトリの責務
| パス | 責務 | 置くもの | 置かないもの |
|---|---|---|---|
| `docs/` | プロジェクトの北極星となる仕様 | 6種の永続的ドキュメント | 作業メモ、タスク一覧、日付つきの進捗 |
| `src/screens/` | 1画面分の表示と操作 | `〇〇Screen.tsx`（入口画面は `〇〇EntryScreen.tsx`）と保護者ゲート | 複数の画面で使う部品、問題を作るロジック |
| `src/components/` | 複数の画面で使う表示部品 | 演出、キャラクター、時計・盤面・キャンバスなどの部品 | 画面全体、問題の生成や採点 |
| `src/domain/` | 学習内容とそのルール | 出題範囲のデータ（`〇〇Bank.ts`）、型（`types.ts`）、問題の生成、採点・レベルアップ・復習（`progress.ts`）、読み上げる文の組み立て | React の部品、画面、ブラウザの API を直接呼ぶ処理 |
| `src/domain/questionGenerators/` | カテゴリごとの問題の生成 | `<カテゴリ>.ts`（レベルに応じた1問を作る関数） | 画面の表示、保存 |
| `src/lib/` | ブラウザの機能を包む共通処理 | 読み上げ（`tts.ts`）、効果音（`sfx.ts`）、BGM（`bgm.ts`）、保存（`storage.ts`）、乱数・並べ替え、書き順の照合 | 学習内容のデータ、画面 |
| `src/i18n/` | 表示文字列と言語の切替 | 日本語・英語の辞書（`dictionary.ts`）、言語の Context | 読み上げ専用の文、出題データ |
| `src/styles/` | 見た目の共通ルール | テーマの変数（`theme.css`）、部品のスタイル（`components.css`） | 1つの部品だけで完結する一時的な調整 |
| `public/` | 実行時に読み込む素材 | 画像・音声・アイコン | 実行時に使わない元データや候補画像 |
| `scripts/` | 素材の生成・検査（開発時のみ） | 生成スクリプト（`generate-*`）、取得（`fetch-*`）、検査（`check-*`、`audit-*`）、組み立て（`build-*`）と、その設定 JSON | アプリが実行時に読み込むコード |
| `.github/workflows/` | 自動ビルドと公開 | `deploy.yml` | － |

## 3. 配置ルール
- **新しいファイルをどこに置くか**
  - 画面を足す → `src/screens/`。App.tsx の画面の型と切替に追加する。
  - 2つ以上の画面で使う見た目 → `src/components/`。1画面でしか使わないものは、その画面のファイルの中に置く。
  - 新しいカテゴリ → 型を `src/domain/types.ts`、出題範囲のデータを `src/domain/<名前>Bank.ts`、問題の生成を `src/domain/questionGenerators/<カテゴリ>.ts`、表示情報を `src/domain/categoryMeta.ts`、レベルの説明を `src/domain/levelDescriptions.ts`、表示文字列を `src/i18n/dictionary.ts` に置く。
  - ブラウザの機能を新しく使う → `src/lib/` に包んでから使う。
  - 画像・音声 → `public/` の種類ごとのフォルダー。生成スクリプトとその設定は `scripts/` に置く。
  - スクリプトが作る TypeScript のデータ（例：`src/domain/spotScenes.ts`）は手で書き換えず、スクリプトを直して作り直す。
  - テスト → 対象と同じ階層の `__tests__/` に `<対象>.test.ts(x)` として置く。
- **依存の方向**
  ```mermaid
  flowchart LR
    App --> screens --> components
    screens --> domain
    components --> domain
    screens --> lib
    components --> lib
    domain --> lib
    screens --> i18n
    components --> i18n
    domain -->|辞書のキーの型| i18n
    i18n --> lib
  ```
  - `domain` は `screens`・`components`・React に依存しない。
  - `domain` から `lib` へは、純粋な関数（`random`、`shuffle`）と保存（`progress.ts` から `storage.ts` だけ）、読み上げの型に限って依存してよい。
  - `lib` は `domain`・`screens`・`components` に依存しない。
  - `components` は `screens` に依存しない。
  - `scripts/` はアプリのコード（`src/`）を読み込んでよい（例：読み上げる文を辞書から取り出す）。逆に `src/` から `scripts/` は読み込まない。

## 4. 命名規則（ファイル・ディレクトリ）
| 対象 | 規則 | 例 |
|---|---|---|
| React の部品・画面 | パスカルケース `.tsx` | `CorrectCelebration.tsx`、`HomeScreen.tsx` |
| 画面 | 末尾を `Screen`、入口画面は `EntryScreen` | `KanjiEntryScreen.tsx` |
| ロジック・データ | キャメルケース `.ts` | `progress.ts`、`kanjiBank.ts` |
| 出題範囲のデータ | 末尾を `Bank` | `wordBank.ts`、`counterBank.ts` |
| 問題の生成 | カテゴリ名と同じ | `questionGenerators/money.ts` |
| テスト | 対象と同じ名前に `.test` | `addition.test.ts` |
| スクリプト | ケバブケース。先頭は動詞（`generate-`、`fetch-`、`build-`、`check-`、`audit-`） | `generate-spot-part-variants.py` |
| スクリプトの共通モジュール・ローカルサーバー | 例外として、役割を表す名詞でよい（既存の名前は変えない） | `gemini-client.mjs`、`image-style-guardrail.mjs`、`remove_bg.py`、`kokoro_server.py` |
| 音声ファイル | `<種類>-<内容>.wav`（キャッシュのキーと同じ名前） | `answer-counting-hon.wav` |
| まちがいさがしの画像 | `spot/<テーマ>/<物>.png`、違いは `<物>__color.png`・`<物>__part.png`、背景の違いは `bg__<id>.jpg` | `spot/forest/fox__part.png` |
| キャラクターの画像 | `characters/<キャラクターid>.png`、差分は `<id>__<差分>.png` | `characters/momo__blink.png` |

## 5. 主要な設定ファイル
| ファイル | 役割 |
|---|---|
| `package.json` | 依存パッケージと npm スクリプト（`dev`、`build`、`test`、`lint`、素材生成） |
| `vite.config.ts` | ビルド設定。公開パス（`/kids-study-app/`）と PWA のマニフェスト |
| `tsconfig.json`、`tsconfig.app.json`、`tsconfig.node.json` | TypeScript の設定（アプリ用と設定ファイル用） |
| `.oxlintrc.json` | リントの規則 |
| `.github/workflows/deploy.yml` | main への push でビルドし、GitHub Pages へ公開する |
| `.env`（Git に含めない）、`.env.example` | 素材生成で使う API キー（`GEMINI_API_KEY`） |
| `scripts/image-style-guardrail.mjs` | 画像生成の画風と、使うモデルの方針 |
| `scripts/spot-*.json` | まちがいさがしの場面・違いの生成設定と、採用しなかった候補の記録 |
