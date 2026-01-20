import React from 'react'

function Login({ onClick, className }) {
  return (
  <button
    onClick={onClick}
    className={`cursor-pointer font-semibold transition ${className || ''}`}
    type="button"
  >
    Login
  </button>
  )
}

export default Login;