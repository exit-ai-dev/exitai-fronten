import { Outlet, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';

// ナビゲーションメニュー。ログインや企業ダッシュボードへのリンクを追加しています。
const nav = [
  { to: '/chat/ai', label: 'AIチャット' },
  { to: '/attendance', label: '勤怠管理' }
];

/**
 * アプリ全体のレイアウトを定義します。ナビゲーションバーとテーマ切替ボタンを含みます。
 * 子コンポーネントは <Outlet /> でレンダリングされます。
 */
export default function AppLayout() {
  // 初期テーマは localStorage またはメディアクエリから取得
  const initialDark = (() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  })();
  const [dark, setDark] = useState(initialDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <>
      <header className="glass border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
          {/* ロゴ */}
          <NavLink to="/" className="text-lg font-bold flex items-center text-foreground">
            {/* brand image; if not found, hide */}
            <img
              src={`${import.meta.env.BASE_URL}brand.jpg`}
              alt="ブランドロゴ"
              className="h-6 w-6 mr-2"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            ExitGpt&nbsp;AI
          </NavLink>
          {/* デスクトップ用ナビ */ }
          <nav className="hidden lg:flex space-x-4">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  'px-3 py-2 rounded-xl text-sm transition ' +
                  (isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground')
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          {/* テーマ切替ボタン */ }
          <button
            onClick={() => setDark((v) => !v)}
            title="テーマ切替"
            className="ml-2 px-3 py-2 rounded-xl border border-border hover:bg-secondary transition"
          >
            {dark ? '🌙' : '☀️'}
          </button>
        </div>
        {/* モバイル用ナビ */ }
        <nav className="lg:hidden overflow-x-auto whitespace-nowrap px-4 py-2">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                'whitespace-nowrap px-3 py-1.5 rounded-xl text-sm transition ' +
                (isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground bg-secondary hover:bg-accent hover:text-foreground')
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </>
  );
}