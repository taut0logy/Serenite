'use client';
import { CardWrapper } from './card-wrapper';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import * as z from "zod";
import { LoginSchema } from '@/schemas';
import { Input } from '@/components/ui/input';

import { Button } from '@/components/ui/button';

import { FormSuccess } from '@/components/form-success';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { FormError } from '@/components/form-error';

export const LoginForm = () => {

  const form = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (values: z.infer<typeof LoginSchema>) => {
    console.log(values);
  }

  return (
    <CardWrapper
      headerLabel='Welcome Back'
      backButtonLabel="Don't have an account" backButtonHref='/auth/register'
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
                      placeholder='********'
                      type='password'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}>

            </FormField>

          </div>

          <FormError message="" />
          <FormSuccess message="" />

          <Button type='submit'
            className='w-full' >
            Login
          </Button>

        </form>
      </Form>
    </CardWrapper>);
}