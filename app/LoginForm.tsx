"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";

const initialState: LoginState = {};

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);
  return (
    <form action={action}>
      {state.error ? <div className="error">{state.error}</div> : null}
      <div className="field">
        <label htmlFor="loginId">아이디</label>
        <input id="loginId" name="loginId" className="input" autoComplete="username" placeholder="아이디 입력" />
      </div>
      <div className="field">
        <label htmlFor="password">비밀번호</label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" placeholder="비밀번호 입력" />
      </div>
      <button className="btn btn-primary btn-full" disabled={pending}>{pending ? "로그인 중..." : "로그인"}</button>
    </form>
  );
}
