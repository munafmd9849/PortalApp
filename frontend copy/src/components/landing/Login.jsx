import React from 'react'

function Login({ onClick, className }) {
  return (
  <button onClick={onClick} className={`px-4 py-2 font-semibold rounded-md transition duration-500 hover:scale-x-110 hover:scale-y-105 cursor-pointer hover:cursor-pointer ${className || ''}`}>Login</button>
  )
}

export default Login;