'use client';

import { useEffect, useState } from 'react';
import { Call, useStreamVideoClient } from '@stream-io/video-react-sdk';

export const useGetCallById = (id: string | string[]) => {
    const [call, setCall] = useState<Call>();
    const [isCallLoading, setIsCallLoading] = useState(true);

    const client = useStreamVideoClient();

    useEffect(() => {
        if (!client || !id) return;

        const loadCall = async () => {
            try {
                const callId = Array.isArray(id) ? id[0] : id;
                
                // First try to query for existing call
                const { calls } = await client.queryCalls({
                    filter_conditions: { id: callId }
                });

                if (calls.length > 0) {
                    setCall(calls[0]);
                } else {
                    // If no existing call, create one with getOrCreate
                    const newCall = client.call('default', callId);
                    await newCall.getOrCreate();
                    setCall(newCall);
                }

                setIsCallLoading(false);
            } catch (error) {
                console.error('Error loading/creating call:', error);
                setIsCallLoading(false);
            }
        };

        loadCall();
    }, [client, id]);

    return { call, isCallLoading };
};

