import { Conversation } from "@elevenlabs/client";

export const createElevenLabsConversation = async () => {
  // Request microphone access first
  await navigator.mediaDevices.getUserMedia({ audio: true });
  
  // Start conversation with agent ID
  return await Conversation.startSession({
    agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || "agent_1201k38p1ktse719v80971j3g4cm",
    connectionType: "websocket",
  });
};

export const ELEVENLABS_AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || "agent_1201k38p1ktse719v80971j3g4cm";