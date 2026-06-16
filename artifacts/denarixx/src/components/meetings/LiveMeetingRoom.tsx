import "@livekit/components-styles";
import {
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
import { X } from "lucide-react";
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

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-white/10 bg-black px-4 py-3 text-white">
          <div>
            <div className="text-sm font-semibold">Denarixx Live Meeting</div>
            <div className="text-xs text-white/60">{roomName}</div>
          </div>

          <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/10">
            <X className="h-4 w-4" />
          </Button>
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
            <div className="min-h-0 flex-1">
              <MeetingStage />
            </div>

            <RoomAudioRenderer />

            <div className="border-t border-white/10 bg-black p-3">
              <ControlBar controls={{ chat: true, screenShare: true }} />
            </div>
          </LayoutContextProvider>
        </LiveKitRoom>
      </div>
    </div>
  );
}
