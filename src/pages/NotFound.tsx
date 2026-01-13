import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="card text-center space-y-3">
      <div className="text-4xl">🧭</div>
      <h2 className="text-xl font-semibold">404 Not Found</h2>
      <p className="text-sm opacity-70">お探しのページは見つかりませんでした。</p>
      <div className="flex justify-center gap-2">
        <Link to="/" className="btn-primary">ホームへ戻る</Link>
        <Link to="/" className="btn-outline">AIチャットへ</Link>
      </div>
    </div>
  );
}
