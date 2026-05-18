# Local Task Manager

## 概要

ブラウザのローカルストレージ (`localStorage`) のみで完結する、個人用の Web タスク管理アプリです。
データは外部へ送信されず、すべて閲覧中のブラウザ内に保存されます。ログイン・サインアップは不要です。

- Repository: `local-task-manager` (public)
- 技術スタック: Vite + React + TypeScript
- 永続化: `localStorage` のみ（同期・バックアップなし）
- 想定利用者: 自分専用（個人ローカル運用）

## 主な機能

- タスクの追加 / 編集 / 削除 / 完了切り替え
- 優先度（高 / 中 / 低）の設定
- 期限（日付）設定
- タグ（複数）付与・候補補完
- カンバン表示（TODO / 進行中 / 完了）+ ドラッグ&ドロップで状態遷移
- テキスト検索（タイトル / 説明 / タグ横断）
- 優先度・タグ・期限による絞り込みフィルタ
- 控えめなダークテーマ
- 100 件上限：超過時は新規追加を拒否しエラー表示
- 保存データ破損検知：警告バナーを表示後、データを破棄して初期状態へ復帰

## 前提条件

- Node.js 18 以上
- npm 9 以上
- モダンブラウザ（Chrome / Edge / Firefox / Safari の最新版を想定）
- `localStorage` が利用可能（プライベートモードや無効化設定では動作しない場合があります）

## 手順

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 開発サーバー起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開いてください。

### 3. 本番ビルド

```bash
npm run build
npm run preview
```

`dist/` 配下に静的ファイルが生成されます。任意の静的ホスティング（GitHub Pages, Netlify, Vercel, S3 等）にそのまま配置できます。

### 4. テスト実行

```bash
npm test
```

`vitest` によるユニットテストが実行されます。`src/storage.test.ts` および `src/hooks/useTasks.test.tsx` を含みます。

### 5. 型チェック

```bash
npm run typecheck
```

## コマンド

| コマンド | 説明 |
| --- | --- |
| `npm run dev` | Vite 開発サーバー起動（HMR 有効） |
| `npm run build` | TypeScript 型チェック + 本番ビルド |
| `npm run preview` | ビルド成果物をローカルでプレビュー |
| `npm run typecheck` | 型チェックのみ（成果物を生成しない） |
| `npm test` | `vitest` でユニットテスト実行 |

## データの保存場所

- ストレージ: ブラウザの `localStorage`
- キー: `local-task-manager:tasks:v1`
- 形式: JSON 配列（`Task[]`）

別ブラウザ・別端末・別プロファイルへの自動同期は行いません。バックアップが必要な場合はブラウザの開発者ツールから手動でエクスポートしてください。

### タスクのデータ構造

```ts
type Task = {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string | null;     // ISO 8601 (YYYY-MM-DD)
  tags: string[];
  status: 'todo' | 'in_progress' | 'done';
  createdAt: string;          // ISO 8601 datetime
  updatedAt: string;          // ISO 8601 datetime
};
```

## アーキテクチャ概要

```
src/
├── App.tsx                  # ルートコンポーネント・状態統合
├── main.tsx                 # エントリポイント
├── types.ts                 # ドメイン型定義・定数
├── storage.ts               # localStorage I/O・破損検知
├── styles.css               # ダークテーマ（CSS 変数）
├── hooks/
│   └── useTasks.ts          # タスクの CRUD・状態遷移ロジック
└── components/
    ├── KanbanBoard.tsx      # 3 列のカンバン UI + D&D
    ├── TaskCard.tsx         # 単一タスクの表示カード
    ├── TaskModal.tsx        # 追加 / 編集モーダル
    └── FilterBar.tsx        # 検索・フィルタ UI
```

## 注意点

- **個人ローカル運用前提**：認証・認可・サーバー側保存は実装していません。共有 PC ではプロファイル分離やブラウザの別ユーザー機能をご利用ください。
- **同期なし**：別端末・別ブラウザ間でタスクは共有されません。
- **件数上限 100 件**：超過時は新規追加を拒否し、画面上にエラー表示します。仕様であり緩和予定はありません。
- **破損時の挙動**：JSON のパース失敗や型不整合を検知した場合、警告バナーを表示してからストレージを初期化します（破損データは復元されません）。
- **静的サイト**：本アプリにバックエンドは存在しません。`dist/` を任意の静的ホスティングに配置するだけでデプロイ可能です。

## トラブルシュート

### タスクが消えた / 起動時に空になる

- 起動時に画面上部の警告バナーが出ていないかご確認ください。表示されていれば `localStorage` の破損検知により初期化された状態です。
- ブラウザのプライベートモードでは `localStorage` がセッション終了で消える場合があります。通常モードでご利用ください。
- 別ブラウザ・別プロファイル・シークレットウィンドウでは別ストレージが使われます。

### 「タスクは最大 100 件までです」と表示される

- 仕様上の上限です。完了タスクを削除するか、不要なタスクを整理してください。

### 開発サーバーが起動しない

- Node.js のバージョンが 18 以上か確認してください (`node -v`)。
- `node_modules` を削除して `npm install` を再実行してください。
- ポート 5173 が他プロセスに占有されていないかご確認ください。

### ビルドが失敗する

- `npm run typecheck` で型エラーの有無を確認してください。
- `tsconfig.json` の参照ファイルが存在するか確認してください。

### `localStorage` を手動で初期化したい

ブラウザの開発者コンソールで次を実行してください。

```js
localStorage.removeItem('local-task-manager:tasks:v1');
location.reload();
```

## 既知の制約

- 100 件超過チェックは React の `useCallback` 依存配列に依拠しており、極めて高頻度の連続呼び出しでは古い状態を参照する余地があります（QA テストで実証済み）。通常の UI 操作では発生しません。
- `localStorage` 読み込み時のバリデーションは型レベルが中心です。手動改ざんで極端に長い文字列を入れた場合、UI の表示崩れが発生する可能性があります。
- 開発依存の `vite` に間接含まれる `esbuild` に既知の Dev Server 向け脆弱性が含まれています。本番ビルド成果物には影響しません。

詳細な経緯と修正履歴は [CHANGELOG.md](./CHANGELOG.md) を参照してください。

## ライセンス

個人利用想定のため特定のライセンスは付与していません。必要に応じて MIT 等を追加してください。
