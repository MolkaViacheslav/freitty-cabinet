import Link from "next/link";

/**
 * The mockup's sidebar nav has exactly one live item ("Orders") — Dashboard/List/Detail all
 * nest under it, there's no separate "Dashboard" entry. Settings and "+ New Order" render
 * disabled (CLAUDE.md: out-of-scope controls render disabled with title, never fake behavior).
 */
export function Sidebar() {
  return (
    <aside className="flex w-[220px] shrink-0 flex-col bg-sidebar py-5 text-white">
      <div className="px-5 pb-6 text-[22px] font-extrabold tracking-tight">
        FREITT<span className="text-red">Y</span>
      </div>
      <nav>
        <ul className="flex flex-col">
          <li>
            <Link
              href="/orders"
              className="flex items-center gap-2.5 border-l-[3px] border-l-red bg-[rgba(46,117,182,0.15)] px-5 py-2.5 text-sm font-semibold text-white"
            >
              📦 Orders
            </Link>
          </li>
          <li
            className="flex cursor-not-allowed items-center gap-2.5 border-l-[3px] border-l-transparent px-5 py-2.5 text-sm text-[#B0B8C4]"
            title="Out of scope"
          >
            ⚙️ Settings
          </li>
        </ul>
      </nav>
      <div className="mt-5 border-t border-white/10 px-5 pt-5">
        <button
          type="button"
          disabled
          title="Out of scope"
          className="w-full cursor-not-allowed rounded-md bg-red/50 px-4 py-2 text-sm font-semibold text-white"
        >
          + New Order
        </button>
      </div>
    </aside>
  );
}
