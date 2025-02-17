'use client';

import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { profileSchema, type ProfileFormValues } from '@/lib/form-schema';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Modal from 'react-modal';
import { FaTimes } from 'react-icons/fa';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { motion } from 'framer-motion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangleIcon, Trash } from 'lucide-react';

// 1. Define Divisions, Districts, and Upazilas of Bangladesh
const divisions = [
  { id: '1', name: 'Barisal' },
  { id: '2', name: 'Chattogram' },
  { id: '3', name: 'Dhaka' },
  { id: '4', name: 'Khulna' },
  { id: '5', name: 'Mymensingh' },
  { id: '6', name: 'Rajshahi' },
  { id: '7', name: 'Rangpur' },
  { id: '8', name: 'Sylhet' },
];

const districtsByDivision: Record<string, { id: string; name: string }[]> = {
  // ... (Ensure that all districts have unique IDs like '1-1', '1-2', etc.)
  '1': [
    { id: '1-1', name: 'Barguna' },
    { id: '1-2', name: 'Barisal Sadar' },
    { id: '1-3', name: 'Bhola' },
    { id: '1-4', name: 'Jhalokati' },
    { id: '1-5', name: 'Patuakhali' },
    { id: '1-6', name: 'Pirojpur' },
  ],
  '2': [
    { id: '2-1', name: 'Bandarban' },
    { id: '2-2', name: 'Brahmanbaria' },
    { id: '2-3', name: 'Chandpur' },
    { id: '2-4', name: 'Chattogram' },
    { id: '2-5', name: 'Cox’s Bazar' },
    { id: '2-6', name: 'Cumilla' },
    { id: '2-7', name: 'Feni' },
    { id: '2-8', name: 'Khagrachari' },
    { id: '2-9', name: 'Lakshmipur' },
    { id: '2-10', name: 'Noakhali' },
    { id: '2-11', name: 'Rangamati' },
  ],
  // Continue for all divisions...
  '8': [
    { id: '8-1', name: 'Habiganj' },
    { id: '8-2', name: 'Moulvibazar' },
    { id: '8-3', name: 'Sunamganj' },
    { id: '8-4', name: 'Sylhet' },
  ],
};

const upzillasByDistrict: Record<string, { id: string; name: string }[]> = {
  // 1. Barguna (id '1-1')
  '1-1': [
    { id: '1-1-1', name: 'Amtali' },
    { id: '1-1-2', name: 'Bamna' },
    { id: '1-1-3', name: 'Barguna Sadar' },
    { id: '1-1-4', name: 'Betagi' },
    { id: '1-1-5', name: 'Patharghata' },
  ],
  // 2. Barisal Sadar (id '1-2')
  '1-2': [
    { id: '1-2-1', name: 'Agailjhara' },
    { id: '1-2-2', name: 'Babuganj' },
    { id: '1-2-3', name: 'Bakerganj' },
    { id: '1-2-4', name: 'Nalchity' },
    { id: '1-2-5', name: 'Barisal Sadar' },
  ],
  // 3. Bhola (id '1-3')
  '1-3': [
    { id: '1-3-1', name: 'Bhola Sadar' },
    { id: '1-3-2', name: 'Burhanuddin' },
    { id: '1-3-3', name: 'Char Fasson' },
    { id: '1-3-4', name: 'Lalmohan' },
    { id: '1-3-5', name: 'Manpura' },
    { id: '1-3-6', name: 'Tazumuddin' },
  ],
  // Continue for all districts...
  '8-4': [
    { id: '8-4-1', name: 'Sylhet Sadar' },
    { id: '8-4-2', name: 'Beanibazar' },
    { id: '8-4-3', name: 'Bansha' },
    { id: '8-4-4', name: 'Golapganj' },
    { id: '8-4-5', name: 'Kanaighat' },
    { id: '8-4-6', name: 'Maulvibazar Sadar' },
    { id: '8-4-7', name: 'Zakiganj' },
  ],
};

// 2. Define a list of predefined avatars
const avatarOptions = [
  { id: 'avatar1', url: '/avatars/avatar1.png' },
  { id: 'avatar2', url: '/avatars/avatar2.png' },
  { id: 'avatar3', url: '/avatars/avatar3.png' },
  // Add more avatars as needed
  { id: 'default', url: '/avatars/default.png' }, // Represents the "Default Avatar" option
];

interface ProfileFormType {
  initialData: any | null;
  categories: any;
}

const ProfileCreateForm: React.FC<ProfileFormType> = ({
  initialData,
  categories,
}) => {
  const params = useParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false); // For avatar modal
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProfileFormValues | null>(null);
  const [success, setSuccess] = useState(false);

  // Set the app element for react-modal inside useEffect
  useEffect(() => {
    const appElement = document.querySelector('#__next') || document.body;
    Modal.setAppElement(appElement as HTMLElement);
  }, []);

  const title = initialData ? 'Edit Profile' : 'Create Your Profile';
  const description = initialData
    ? 'Edit your profile information.'
    : 'To create your profile, we first need some basic information about you.';
  const toastMessage = initialData ? 'Profile updated.' : 'Profile created.';
  const action = initialData ? 'Save changes' : 'Create';

  const [previousStep, setPreviousStep] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const delta = currentStep - previousStep;

  const defaultValues: ProfileFormValues = {
    username: '',
    fullname: '',
    email: '',
    role: '',
    mobile: '',
    division: '',
    district: '',
    upzilla: '',
    avatar: '/avatars/default.png', // Initialize with default avatar URL
  };

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
    mode: 'onChange',
  });

  const {
    control,
    formState: { errors },
    watch,
    setValue,
  } = form;

  const selectedDivision = useWatch({
    control,
    name: 'division',
  });

  const selectedDistrict = useWatch({
    control,
    name: 'district',
  });

  const upzillas =
    selectedDistrict && upzillasByDistrict[selectedDistrict]
      ? upzillasByDistrict[selectedDistrict]
      : [];

  const selectedAvatar = useWatch({
    control,
    name: 'avatar',
  });

  // Debugging Logs
  useEffect(() => {
    console.log('Selected Division:', selectedDivision);
  }, [selectedDivision]);

  useEffect(() => {
    console.log('Selected District:', selectedDistrict);
    console.log('Available Upzillas:', upzillasByDistrict[selectedDistrict]);
  }, [selectedDistrict]);

  // Function to navigate to the next step
  const next = async () => {
    const fieldsToValidate = steps[currentStep].fields;

    const output = await form.trigger(fieldsToValidate as (keyof ProfileFormValues)[], {
      shouldFocus: true,
    });

    if (!output) return;

    if (currentStep < steps.length - 1) {
      setPreviousStep(currentStep);
      setCurrentStep((step) => step + 1);
    }
  };

  const prev = () => {
    if (currentStep > 0) {
      setPreviousStep(currentStep);
      setCurrentStep((step) => step - 1);
    }
  };

  // Handle form submission
  const onSubmit = async (formData: ProfileFormValues) => {
    try {
      setLoading(true);
      // Implement your submission logic here (e.g., API call)
      console.log('Form Data:', formData);
      setSuccess(true);
      setData(formData);
      // Optionally, reset the form
      // form.reset();
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const processForm = (formData: ProfileFormValues) => {
    onSubmit(formData);
  };

  type FieldName = keyof ProfileFormValues;

  const steps = [
    {
      id: 'Step 1',
      name: 'Personal Information',
      fields: [
        'username',
        'fullname',
        'email',
        'role',
        'mobile',
        'division',
        'district',
        'upzilla',
      ],
    },
    {
      id: 'Step 2',
      name: 'Avatar Selection',
      fields: ['avatar'],
    },
    {
      id: 'Step 3',
      name: 'Complete',
      fields: [],
    },
  ];

  // Modal styles for enlarged avatar
  const customModalStyles = {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      padding: '0',
      border: 'none',
      background: 'none',
    },
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
    },
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={title} description={description} />
        {initialData && (
          <Button
            disabled={loading}
            variant="destructive"
            size="sm"
            onClick={() => setOpen(true)}
          >
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Separator />
      <div>
        <ul className="flex gap-4">
          {steps.map((step, index) => (
            <li key={step.name} className="md:flex-1">
              {currentStep > index ? (
                <div className="group flex w-full flex-col border-l-4 border-sky-600 py-2 pl-4 transition-colors md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4">
                  <span className="text-sm font-medium text-sky-600 transition-colors ">
                    {step.id}
                  </span>
                  <span className="text-sm font-medium">{step.name}</span>
                </div>
              ) : currentStep === index ? (
                <div
                  className="flex w-full flex-col border-l-4 border-sky-600 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4"
                  aria-current="step"
                >
                  <span className="text-sm font-medium text-sky-600">
                    {step.id}
                  </span>
                  <span className="text-sm font-medium">{step.name}</span>
                </div>
              ) : (
                <div className="group flex h-full w-full flex-col border-l-4 border-gray-200 py-2 pl-4 transition-colors md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4">
                  <span className="text-sm font-medium text-gray-500 transition-colors">
                    {step.id}
                  </span>
                  <span className="text-sm font-medium">{step.name}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(processForm)} className="w-full space-y-8">
          <div
            className={cn(
              currentStep === 1 ? 'w-full md:inline-block' : 'gap-8 md:grid md:grid-cols-3'
            )}
          >
            {currentStep === 0 && (
              <>
                {/* Username */}
                <FormField
                  control={control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading}
                          placeholder="Enter your username"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Full Name */}
                <FormField
                  control={control}
                  name="fullname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading}
                          placeholder="Enter your full name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          disabled={loading}
                          placeholder="johndoe@gmail.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Role */}
                <FormField
                  control={control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading}
                          placeholder="Enter your role"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Mobile Number */}
                <FormField
                  control={control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          disabled={loading}
                          placeholder="Enter your mobile number"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Division */}
                <FormField
                  control={control}
                  name="division"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Division</FormLabel>
                      <Select
                        disabled={loading}
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset district and upzilla when division changes
                          setValue('district', '');
                          setValue('upzilla', '');
                        }}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a division" />
                        </SelectTrigger>
                        <SelectContent>
                          {divisions.map((division) => (
                            <SelectItem key={division.id} value={division.id}>
                              {division.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* District */}
                <FormField
                  control={control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>District</FormLabel>
                      <Select
                        disabled={!selectedDivision || loading}
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset upzilla when district changes
                          setValue('upzilla', '');
                        }}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a district" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedDivision &&
                            districtsByDivision[selectedDivision]?.map((district) => (
                              <SelectItem key={district.id} value={district.id}>
                                {district.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Upzilla */}
                <FormField
                  control={control}
                  name="upzilla"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Upzilla</FormLabel>
                      <Select
                        disabled={!selectedDistrict || loading}
                        onValueChange={(value) => {
                          field.onChange(value);
                          console.log('Selected Upzilla:', value);
                        }}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an upzilla" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedDistrict ? (
                            upzillasByDistrict[selectedDistrict]?.length > 0 ? (
                              upzillasByDistrict[selectedDistrict].map((upzilla) => (
                                <SelectItem key={upzilla.id} value={upzilla.id}>
                                  {upzilla.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-upzillas" disabled>No Upzillas Available</SelectItem>
                            )
                          ) : (
                            <SelectItem value="no-district" disabled>Select a district first</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {currentStep === 1 && (
              <>
                {/* Avatar Selection */}
                <FormField
                  control={control}
                  name="avatar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Choose an Avatar (Optional)</FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="flex flex-wrap gap-4"
                        >
                          {avatarOptions.map((avatar) => (
                            <RadioGroupItem
                              key={avatar.id}
                              value={avatar.url}
                              className="cursor-pointer"
                            >
                              <div className="flex flex-col items-center">
                                {avatar.id === 'default' ? (
                                  <>
                                    <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
                                      <span className="text-gray-700">Default</span>
                                    </div>
                                    <span className="mt-2 text-sm">Default Avatar</span>
                                  </>
                                ) : (
                                  <>
                                    <img
                                      src={avatar.url}
                                      alt={`Avatar ${avatar.id}`}
                                      className={`h-16 w-16 rounded-full border ${
                                        field.value === avatar.url
                                          ? 'border-sky-500'
                                          : 'border-gray-300'
                                      } cursor-pointer transition-transform transform hover:scale-105`}
                                    />
                                    <span className="mt-2 text-sm">Avatar {avatar.id.replace('avatar', '')}</span>
                                  </>
                                )}
                              </div>
                            </RadioGroupItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {currentStep === 2 && data && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Review Your Information</h2>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <strong className="w-32">Username:</strong>
                    <span>{data.username}</span>
                  </div>
                  <div className="flex items-center">
                    <strong className="w-32">Full Name:</strong>
                    <span>{data.fullname}</span>
                  </div>
                  <div className="flex items-center">
                    <strong className="w-32">Email:</strong>
                    <span>{data.email}</span>
                  </div>
                  <div className="flex items-center">
                    <strong className="w-32">Role:</strong>
                    <span>{data.role}</span>
                  </div>
                  <div className="flex items-center">
                    <strong className="w-32">Mobile:</strong>
                    <span>{data.mobile}</span>
                  </div>
                  <div className="flex items-center">
                    <strong className="w-32">Division:</strong>
                    <span>
                      {divisions.find((div) => div.id === data.division)?.name || ''}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <strong className="w-32">District:</strong>
                    <span>
                      {districtsByDivision[data.division]?.find(
                        (dist) => dist.id === data.district
                      )?.name || ''}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <strong className="w-32">Upzilla:</strong>
                    <span>
                      {upzillasByDistrict[data.district]?.find(
                        (upz) => upz.id === data.upzilla
                      )?.name || ''}
                    </span>
                  </div>
                  {/* Avatar Display */}
                  <div className="flex flex-col items-center">
                    <strong>Avatar:</strong>
                    <img
                      src={data.avatar ? data.avatar : '/avatars/default.png'}
                      alt="User Avatar"
                      className="mt-2 h-48 w-48 rounded-full object-cover border-4 border-sky-500 shadow-lg"
                    />
                  </div>
                </div>
                {success && (
                  <div className="mt-4 rounded-md bg-green-100 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <AlertTriangleIcon className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">Success!</h3>
                        <div className="mt-2 text-sm text-green-700">
                          <p>{toastMessage}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="mt-8 pt-5">
            <div className="flex justify-between">
              <button
                type="button"
                onClick={prev}
                disabled={currentStep === 0}
                className="rounded bg-white px-4 py-2 text-sm font-semibold text-sky-900 shadow-sm ring-1 ring-inset ring-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50 flex items-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="h-5 w-5 mr-2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5L8.25 12l7.5-7.5"
                  />
                </svg>
                Previous
              </button>
              {currentStep < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={next}
                  disabled={currentStep === steps.length - 1}
                  className="rounded bg-white px-4 py-2 text-sm font-semibold text-sky-900 shadow-sm ring-1 ring-inset ring-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50 flex items-center"
                >
                  Next
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="h-5 w-5 ml-2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                </button>
              ) : (
                <Button
                  disabled={loading}
                  type="submit"
                  className="rounded bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 flex items-center"
                >
                  {action}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="h-5 w-5 ml-2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75"
                    />
                  </svg>
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>

      {/* Optional Delete Confirmation Modal */}
      <Modal
        isOpen={open}
        onRequestClose={() => setOpen(false)}
        style={customModalStyles}
      >
        <div className="relative bg-white rounded-lg shadow-lg p-6">
          <button
            onClick={() => setOpen(false)}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          >
            <FaTimes size={20} />
          </button>
          <h2 className="text-xl font-semibold mb-4">Delete Profile</h2>
          <p className="mb-4">Are you sure you want to delete your profile? This action cannot be undone.</p>
          <div className="flex justify-end gap-4">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => {
              // Implement delete logic here
              setOpen(false);
              // Example:
              // handleDelete();
            }}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>

  );

};
export default ProfileCreateForm;
