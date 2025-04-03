import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <header className="App-header">
        <h1>SoulSeer</h1>
        <p>Your Spiritual Connection Platform</p>
      </header>
      <main>
        <h2>Welcome to SoulSeer</h2>
        <p>
          We are building a comprehensive spiritual connection platform bridging psychic readers 
          with clients through innovative digital experiences.
        </p>
        <div>
          <button onClick={() => setCount((count) => count + 1)}>
            Count is: {count}
          </button>
        </div>
      </main>
    </div>
  )
}

export default App