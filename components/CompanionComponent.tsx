'use client';

import {useEffect, useRef, useState} from 'react'
import {cn, getSubjectColor} from "@/lib/utils";
import {createElevenLabsConversation} from "@/lib/elevenlabs.sdk";
import Image from "next/image";
import Lottie, {LottieRefCurrentProps} from "lottie-react";
import soundwaves from '@/constants/soundwaves.json'
import {addToSessionHistory} from "@/lib/actions/companion.actions";
import {evaluateElevenLabsSession} from "@/lib/actions/elevenlabs-evaluation.actions";

enum CallStatus {
    INACTIVE = 'INACTIVE',
    CONNECTING = 'CONNECTING',
    ACTIVE = 'ACTIVE',
    FINISHED = 'FINISHED',
}

const CompanionComponent = ({ companionId, subject, topic, name, userName, userImage }: CompanionComponentProps) => {
    const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
    const [isSpeaking] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [messages, setMessages] = useState<SavedMessage[]>([]);
    const [currentCallId, setCurrentCallId] = useState<string | null>(null);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [evaluationComplete, setEvaluationComplete] = useState(false);
    const [conversation, setConversation] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

    const lottieRef = useRef<LottieRefCurrentProps>(null);

    useEffect(() => {
        if(lottieRef) {
            if(isSpeaking) {
                lottieRef.current?.play()
            } else {
                lottieRef.current?.stop()
            }
        }
    }, [isSpeaking, lottieRef])

    useEffect(() => {




        // ElevenLabs conversation event setup will be handled in handleCall
        return () => {
            // Cleanup will be handled when conversation ends
        }
    }, []);

    const toggleMicrophone = () => {
        if (conversation) {
            conversation.setMuted(!isMuted);
            setIsMuted(!isMuted);
        }
    }

    const handleCall = async () => {
        setCallStatus(CallStatus.CONNECTING);
        setIsEvaluating(false);
        setEvaluationComplete(false);
        setMessages([]); // Clear previous messages

        try {
            const newConversation = await createElevenLabsConversation();
            setConversation(newConversation);
            setCallStatus(CallStatus.ACTIVE);
            setCurrentCallId(`call_${Date.now()}`);
            
            // Note: Event handlers would need to be set up based on ElevenLabs API
            // This is a simplified implementation
            
        } catch (error) {
            console.error('Failed to start ElevenLabs conversation:', error);
            setCallStatus(CallStatus.INACTIVE);
        }
    }

    const handleDisconnect = async () => {
        setCallStatus(CallStatus.FINISHED);
        if (conversation) {
            await conversation.endSession();
            
            // Trigger evaluation
            setIsEvaluating(true);
            
            let evaluationData = null;
            if (currentCallId && messages.length > 0) {
                try {
                    const evaluation = await evaluateElevenLabsSession(
                        currentCallId,
                        messages,
                        { subject, topic, name }
                    );
                    
                    evaluationData = {
                        score: evaluation.score,
                        summary: evaluation.summary,
                        duration: evaluation.metrics.duration,
                        engagement_score: evaluation.metrics.engagement,
                        comprehension_score: evaluation.metrics.comprehension,
                        participation_score: evaluation.metrics.participation,
                        insights: evaluation.insights
                    };
                    
                    console.log('Session Evaluation:', evaluation);
                } catch (error) {
                    console.error('Failed to evaluate session:', error);
                }
            }
            
            // Save session to history with evaluation data
            await addToSessionHistory(companionId, currentCallId, evaluationData || undefined);
            
            setIsEvaluating(false);
            setEvaluationComplete(true);
            setCurrentCallId(null);
            
            // Reset evaluation complete state after showing success
            setTimeout(() => {
                setEvaluationComplete(false);
            }, 3000);
        }
    }

    return (
        <section className="flex flex-col h-[70vh]">
            <section className="flex gap-8 max-sm:flex-col">
                <div className="companion-section">
                    <div className="companion-avatar" style={{ backgroundColor: getSubjectColor(subject)}}>
                        <div
                            className={
                            cn(
                                'absolute transition-opacity duration-1000', callStatus === CallStatus.FINISHED || callStatus === CallStatus.INACTIVE ? 'opacity-1001' : 'opacity-0', callStatus === CallStatus.CONNECTING && 'opacity-100 animate-pulse'
                            )
                        }>
                            <Image src={`/icons/${subject}.svg`} alt={subject} width={150} height={150} className="max-sm:w-fit" />
                        </div>

                        <div className={cn('absolute transition-opacity duration-1000', callStatus === CallStatus.ACTIVE ? 'opacity-100': 'opacity-0')}>
                            <Lottie
                                lottieRef={lottieRef}
                                animationData={soundwaves}
                                autoplay={false}
                                className="companion-lottie"
                            />
                        </div>
                    </div>
                    <p className="font-bold text-2xl">{name}</p>
                </div>

                <div className="user-section">
                    <div className="user-avatar">
                        <Image src={userImage} alt={userName} width={130} height={130} className="rounded-lg" />
                        <p className="font-bold text-2xl">
                            {userName}
                        </p>
                    </div>
                    <button className="btn-mic" onClick={toggleMicrophone} disabled={callStatus !== CallStatus.ACTIVE}>
                        <Image src={isMuted ? '/icons/mic-off.svg' : '/icons/mic-on.svg'} alt="mic" width={36} height={36} />
                        <p className="max-sm:hidden">
                            {isMuted ? 'Turn on microphone' : 'Turn off microphone'}
                        </p>
                    </button>
                    <button className={cn('rounded-lg py-2 cursor-pointer transition-colors w-full text-white', callStatus ===CallStatus.ACTIVE ? 'bg-red-700' : 'bg-primary', callStatus === CallStatus.CONNECTING && 'animate-pulse')} onClick={callStatus === CallStatus.ACTIVE ? handleDisconnect : handleCall}>
                        {callStatus === CallStatus.ACTIVE
                        ? "End Session"
                        : callStatus === CallStatus.CONNECTING
                            ? 'Connecting'
                        : 'Start Session'
                        }
                    </button>
                    
                    {/* Evaluation Status Display */}
                    {isEvaluating && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                <span className="text-sm text-blue-700 font-medium">
                                    Analyzing session performance...
                                </span>
                            </div>
                        </div>
                    )}
                    
                    {evaluationComplete && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2">
                                <div className="rounded-full h-4 w-4 bg-green-600 flex items-center justify-center">
                                    <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 8 8">
                                        <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z"/>
                                    </svg>
                                </div>
                                <span className="text-sm text-green-700 font-medium">
                                    Session evaluated and saved!
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <section className="transcript">
                <div className="transcript-message no-scrollbar">
                    {messages.map((message, index) => {
                        if(message.role === 'assistant') {
                            return (
                                <p key={index} className="max-sm:text-sm">
                                    {
                                        name
                                            .split(' ')[0]
                                            .replace('/[.,]/g, ','')
                                    }: {message.content}
                                </p>
                            )
                        } else {
                           return <p key={index} className="text-primary max-sm:text-sm">
                                {userName}: {message.content}
                            </p>
                        }
                    })}
                </div>

                <div className="transcript-fade" />
            </section>
        </section>
    )
}

export default CompanionComponent
