'use client';
import { CardWrapper } from './card-wrapper';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import * as z from "zod";
import { LoginSchema } from '@/schemas';
import { Input } from '@/components/ui/input';

import { Button } from '@/components/ui/button';

import { FormSuccess } from '@/components/form-success';
import { useState } from 'react';

import { login } from '@/actions/login';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { FormError } from '@/components/form-error';

import { useTransition } from 'react';
import Link from 'next/link';

export const ResetForm = () => {
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error') === "OAuthAccountNotLinked" ? "Email already in use with another provider" : "";

  const [error, setError] = useState<string | undefined>("");
  const [success, setSuccess] = useState<string | undefined>("");

  const [isPending, startTransition] = useTransition();
  const form = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (values: z.infer<typeof LoginSchema>) => {
    setError("");
    setSuccess("");

    startTransition(() => {
      login(values).then((data) => {
        setError(data?.error);
        setSuccess(data?.success);

      }
      );
    });
  }

  return (
    <CardWrapper
      headerLabel='Forgot your password?'
      backButtonLabel="Back to login" backButtonHref='/auth/login'
      showSocial>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}
          className='space-y-6'>

          <div className='space-y-4'>

            <FormField control={form.control} name='email'
              render={({ field }) =>
              (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field}
                      disabled={isPending}
                      placeholder='sakib@gmail.com'
                      type='email'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}>

            </FormField>

            <FormField control={form.control} name='password'
              render={({ field }) =>
              (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input {...field}
                      disabled={isPending}
                      placeholder='********'
                      type='password'
                    />
                  </FormControl>
                  <Button
                  size="sm" 
                  variant="link"
                  asChild
                  className='px-0 font-normal'
                  >
                    <Link href="/auth/reset">Forgot password?</Link>
                  </Button>
                  <FormMessage />
                </FormItem>
              )}>

            </FormField>

          </div>

          <FormError message={error || urlError} />
          <FormSuccess message={success} />

          <Button disabled={isPending} type='submit'
            className='w-full' >
            Login
          </Button>

        </form>
      </Form>
    </CardWrapper>);
}