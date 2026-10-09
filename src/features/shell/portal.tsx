import { BrowserRouter, Route, Routes } from "react-router-dom"

import {
  ForgotPasswordScreen,
  LoginScreen,
  ResetPasswordScreen,
} from "@/features/auth/screens"

import { PortalShell } from "./portal-shell"
import { GuestOnly, HomeRedirect, RequireAuth } from "./route-guards"

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnly>
            <LoginScreen />
          </GuestOnly>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <GuestOnly>
            <ForgotPasswordScreen />
          </GuestOnly>
        }
      />
      <Route
        path="/reset-password"
        element={
          <GuestOnly>
            <ResetPasswordScreen />
          </GuestOnly>
        }
      />
      <Route
        path="/set-password"
        element={
          <GuestOnly>
            <ResetPasswordScreen />
          </GuestOnly>
        }
      />
      <Route path="/" element={<HomeRedirect />} />
      <Route
        path="/:role/:section/*"
        element={
          <RequireAuth>
            <PortalShell />
          </RequireAuth>
        }
      />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}

export function Portal() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
