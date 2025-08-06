"use client"

import { useState, useRef } from "react"
import { Card } from "@/components/ui/card"
import axios from "@/lib/axios"

export default function KYCPage() {
  const [step, setStep] = useState(1)
  const [idPhoto, setIdPhoto] = useState<File | null>(null)
  const [selfiePhoto, setSelfiePhoto] = useState<File | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<any>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error("Failed to access camera:", error)
    }
  }

  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIdPhoto(e.target.files[0])
      setStep(2)
    }
  }

  const captureSelfie = async () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0)
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' })
            setSelfiePhoto(file)
            
            // Create FormData for selfie upload
            const selfieFormData = new FormData()
            selfieFormData.append('user_id', 'test-user')
            selfieFormData.append('selfies', file) // Changed from 'selfies[]' to 'selfies'

            try {
              const selfieResponse = await axios.post('http://localhost:8000/kyc/upload-selfies', selfieFormData)

              if (selfieResponse.status !== 200) {
                throw new Error('Failed to upload selfie')
              }
              
              const selfieResult = selfieResponse.data
              console.log('Selfie upload result:', selfieResult)
              
              // Start verification if we have both ID and selfie
              if (idPhoto) {
                startVerification(selfieResult.file_paths)
              }
            } catch (error) {
              console.error('Error uploading selfie:', error)
            }
          }
        }, 'image/jpeg', 0.9) // Added quality parameter
      }
    }
  }

  const startVerification = async (selfiePaths: string[]) => {
    if (!idPhoto) return

    setIsVerifying(true)
    setStep(3)

    try {
      // Upload ID photo if not already uploaded
      let idPhotoPath = ''
      if (idPhoto) {
        const idFormData = new FormData()
        idFormData.append('user_id', 'test-user')
        idFormData.append('id_photo', idPhoto)

        const idResponse = await axios.post('/kyc/upload-id', idFormData)
        const idResult = idResponse.data
        idPhotoPath = idResult.file_path
      }

      // Verify identity
      const verifyResponse = await axios.post('/kyc/verify', {
        id_photo_path: idPhotoPath,
        selfie_paths: selfiePaths,
      })

      const result = await verifyResponse.data
      setVerificationResult(result)
    } catch (error) {
      console.error('Verification failed:', error)
      setVerificationResult({ verified: false, error: 'Verification failed' })
    } finally {
      setIsVerifying(false)
    }
  }


  return (
    <main className="container mx-auto py-8 px-4">
      <Card className="max-w-2xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-center mb-2">
            Identity Verification
          </h1>
          <p className="text-gray-500 text-center">
            Complete these steps to verify your identity
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between mb-8">
          {[1, 2, 3].map((number) => (
            <div
              key={number}
              className={`flex items-center ${
                step >= number ? "text-blue-600" : "text-gray-400"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold
                ${
                  step >= number
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-300"
                }`}
              >
                {number}
              </div>
              {number < 3 && (
                <div
                  className={`w-24 h-0.5 mx-2 ${
                    step > number ? "bg-blue-600" : "bg-gray-300"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="space-y-6">
          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Upload ID Document</h2>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="id-upload"
                  onChange={handleIdUpload}
                />
                <label
                  htmlFor="id-upload"
                  className="cursor-pointer text-blue-600 hover:text-blue-700"
                >
                  <div className="mb-2">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <p className="text-sm">Click to upload your ID document</p>
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Take a Selfie</h2>
              <div className="space-y-4">
                <button
                  onClick={startCamera}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Start Camera
                </button>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg border"
                />
                <button
                  onClick={captureSelfie}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Capture Photo
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center">
              {isVerifying ? (
                <>
                  <svg
                    className="animate-spin mx-auto h-12 w-12 text-blue-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <h2 className="mt-4 text-lg font-semibold">
                    Verification in Progress
                  </h2>
                  <p className="mt-2 text-gray-500">
                    Please wait while we verify your identity...
                  </p>
                </>
              ) : verificationResult && (
                <>
                  <svg
                    className={`mx-auto h-12 w-12 ${
                      verificationResult.verified ? 'text-green-500' : 'text-red-500'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {verificationResult.verified ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    )}
                  </svg>
                  <h2 className="mt-4 text-lg font-semibold">
                    {verificationResult.verified
                      ? 'Verification Successful'
                      : 'Verification Failed'}
                  </h2>
                  <p className="mt-2 text-gray-500">
                    {verificationResult.verified
                      ? 'Your identity has been verified successfully.'
                      : 'Please try again with clearer photos.'}
                  </p>
                  {verificationResult.confidence && (
                    <p className="mt-2 text-sm text-gray-400">
                      Confidence: {(verificationResult.confidence * 100).toFixed(1)}%
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            {step > 1 && !isVerifying && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Back
              </button>
            )}
          </div>
        </div>
      </Card>
    </main>
  )
}
