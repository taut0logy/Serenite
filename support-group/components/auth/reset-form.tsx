'use client';
import { CardWrapper } from './card-wrapper';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

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
      
      >
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

           

          </div>

          <FormError message={error } />
          <FormSuccess message={success} />

          <Button disabled={isPending} type='submit'
            className='w-full' >
            Send reset email
          </Button>

        </form>
      </Form>
    </CardWrapper>);
}