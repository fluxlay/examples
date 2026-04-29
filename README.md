# Fluxlay Examples

[Fluxlay](https://fluxlay.com) でライブ壁紙を作るための公式サンプル集です。各ディレクトリは単体で動作する独立したプロジェクトで、`@fluxlay/cli` の `dev` / `build` / `publish` コマンドにそのまま利用できます。

## サンプル一覧

| サンプル | 概要 | 使われている API |
| --- | --- | --- |
| [hello-world](./hello-world) | 最小構成のテンプレート。新規プロジェクトの雛形に。 | — |
| [mouse-follower](./mouse-follower) | カーソルに追従する星粒子。React Spring 物理アニメーション。 | `useMousePosition` |
| [gradient-waves](./gradient-waves) | 時間帯で色が変わる多層グラデーション波。 | `useMousePosition` |
| [particle-flow-field](./particle-flow-field) | Perlin ノイズによるフロー場と粒子トレイル。 | `useMousePosition` |
| [glass-cube](./glass-cube) | React Three Fiber で描画する屈折ガラスキューブ。 | `useMousePosition` |
| [audio-visualizer](./audio-visualizer) | 円形周波数バー + 再生中メディア表示。 | Audio capture, Media metadata, Custom properties |
| [matrix-rain](./matrix-rain) | CPU 負荷に反応する Matrix 風デジタルレイン。 | `useSystemMonitor` |
| [system-monitor](./system-monitor) | CPU / メモリ / ネット I/O などをサイバーパンク調 HUD で表示。 | `useSystemMonitor` |
| [run-command](./run-command) | macchina / pmset / curl 等の出力をデスクトップに表示。 | `shell`, `network` |

## 使い方

各サンプルディレクトリで以下を実行します。

```sh
cd <example>
pnpm install
pnpm dev       # Fluxlay アプリと連携した開発サーバー（HMR）
pnpm build     # wallpaper.fluxlay を生成
pnpm publish   # Fluxlay ストアへ公開（要ログイン）
```

> [!NOTE]
> 開発サーバーの利用には [Fluxlay デスクトップアプリ](https://fluxlay.com) のインストールと、`fluxlay login` での認証が必要です。

## 必要環境

- Node.js 20+ / pnpm 10+
- macOS または Windows（Fluxlay 本体の対応 OS）
- `run-command` サンプルのみ追加で `macchina`, `curl`, `jq` が必要

## プロジェクト構成

すべてのサンプルは共通して以下の構成を持ちます。

```
<example>/
├── fluxlay.yaml      # 壁紙マニフェスト（name / slug / kind: web / properties など）
├── package.json      # @fluxlay/cli, @fluxlay/vite, @fluxlay/react を依存に持つ
├── vite.config.ts    # @fluxlay/vite プラグインを設定
├── index.html
└── src/main.tsx      # 壁紙のエントリーポイント
```

`fluxlay.yaml` の仕様は [`@fluxlay/cli` の README](https://github.com/fluxlay/cli) を参照してください。

## ライセンス

各サンプルは [MIT License](./LICENSE) のもとで提供されます。自由にフォーク・改変して独自の壁紙作成にお役立てください。
