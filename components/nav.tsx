"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/components/providers/user-provider";

export function Nav() {
  const pathname = usePathname();
  const { user, logout } = useUser();
  const [open, setOpen] = useState(false);

  const isInicioActive = pathname === "/";
  const isBibliotecaActive =
    pathname === "/biblioteca" || pathname.startsWith("/juegos");
  const isSalonActive = pathname === "/salon-de-la-fama";
  const isAuthActive = pathname === "/auth";

  const close = () => setOpen(false);

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={isInicioActive ? "active" : ""}>
            Inicio
          </Link>
          <Link
            href="/biblioteca"
            className={isBibliotecaActive ? "active" : ""}
          >
            Biblioteca
          </Link>
          <Link
            href="/salon-de-la-fama"
            className={isSalonActive ? "active" : ""}
          >
            Salón de la Fama
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <button className="btn ghost auth-btn" onClick={logout}>
            {user.name} ▾
          </button>
        ) : (
          <Link href="/auth" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}
        <button
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>

      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={close}
      ></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>
          MENÚ
        </div>
        <Link href="/" className={isInicioActive ? "active" : ""} onClick={close}>
          Inicio
        </Link>
        <Link
          href="/biblioteca"
          className={isBibliotecaActive ? "active" : ""}
          onClick={close}
        >
          Biblioteca
        </Link>
        <Link
          href="/salon-de-la-fama"
          className={isSalonActive ? "active" : ""}
          onClick={close}
        >
          Salón de la Fama
        </Link>
        {user ? (
          <a
            className={isAuthActive ? "active" : ""}
            onClick={() => {
              close();
              logout();
            }}
          >
            Cuenta
          </a>
        ) : (
          <Link href="/auth" className={isAuthActive ? "active" : ""} onClick={close}>
            Iniciar Sesión
          </Link>
        )}
        <div style={{ flex: 1 }}></div>
        <div className="pixel" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}>
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
