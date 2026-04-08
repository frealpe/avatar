import { useState } from 'react'
import './App.css'

function App() {
  const [selectedImage, setSelectedImage] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [modelUrl, setModelUrl] = useState(null)
  const [error, setError] = useState(null)

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0])
      setModelUrl(null)
      setError(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedImage) return

    setIsProcessing(true)
    setError(null)
    setModelUrl(null)

    const formData = new FormData()
    formData.append('image', selectedImage)

    try {
      const response = await fetch('http://localhost:3000/generate', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to generate model')
      }

      const data = await response.json()
      setModelUrl(data.modelUrl)
    } catch (err) {
      console.error(err)
      setError('An error occurred during generation. Please make sure the backend is running.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="App" style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Costurero IA Digital</h1>
      <p>Upload an image of a person to generate a 3D avatar with simulated clothing.</p>

      <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          disabled={isProcessing}
        />
        <button
          type="submit"
          disabled={!selectedImage || isProcessing}
          style={{ marginLeft: '1rem', padding: '0.5rem 1rem' }}
        >
          {isProcessing ? 'Generating...' : 'Generate Avatar'}
        </button>
      </form>

      {error && (
        <div style={{ color: 'red', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {modelUrl && (
        <div style={{ width: '100%', height: '500px', border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}>
          {/* We use the google model-viewer web component */}
          <model-viewer
            src={modelUrl}
            alt="A 3D model of an avatar with clothing"
            auto-rotate
            camera-controls
            style={{ width: '100%', height: '100%', backgroundColor: '#f0f0f0' }}
          ></model-viewer>
        </div>
      )}
    </div>
  )
}

export default App
