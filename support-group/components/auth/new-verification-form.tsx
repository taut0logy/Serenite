"use client"
import { BeatLoader } from "react-spinners";
import { CardWrapper } from '@/components/auth/card-wrapper';

export const NewVerificationFrom = () => {
  return (
    <CardWrapper
    headerLabel="Confirming your verification"
    backButtonLabel="Back to login"
    backButtonHref="/auth/login">
      <div className="flex items-center w-full justify-center">
        <BeatLoader />
        </div>
    </CardWrapper>
  )
}