import "@livekit/components-styles";
import {
  Chat,
  ControlBar,
  GridLayout,
  LayoutContextProvider,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useCreateLayoutContext,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { MessageSquare, X } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";

type LiveMeetingRoomProps = {
  token: string;
  serverUrl: string;
  roomName: string;
  onClose: () => void;
};

function MeetingStage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <GridLayout tracks={tracks} className="h-full">
      <ParticipantTile />
    </GridLayout>
  );
}

export function LiveMeetingRoom({ token, serverUrl, roomName, onClose }: LiveMeetingRoomProps) {
  const layoutContext = useCreateLayoutContext();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-white/10 bg-black px-4 py-3 text-white">
          <div>
            <div className="text-sm font-semibold">Denarixx Live Meeting</div>
            <div className="text-xs text-white/60">{roomName}</div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChatOpen((value) => !value)}
              className="text-white hover:bg-white/10"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Chat
            </Button>

            <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/10">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect
          video
          audio
          className="flex min-h-0 flex-1 flex-col bg-black"
        >
          <LayoutContextProvider value={layoutContext}>
            <div className="flex min-h-0 flex-1">
              <div className="min-w-0 flex-1">
                <MeetingStage />
              </div>

              {chatOpen && (
                <aside className="w-[360px] max-w-[40vw] border-l border-white/10 bg-zinc-950 text-white">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">Meeting Chat</p>
                      <p className="text-xs text-white/50">LiveKit room chat</p>
                    </div>
                    <button onClick={() => setChatOpen(false)} className="text-white/70 hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="h-[calc(100%-57px)]">
                    <Chat />
                  </div>
                </aside>
              )}
            </div>

            <RoomAudioRenderer />

            <div className="border-t border-white/10 bg-black p-3">
              <ControlBar controls={{ chat: false, screenShare: true }} />
            </div>
          </LayoutContextProvider>
        </LiveKitRoom>
      </div>
    </div>
  );
}
