import process from "node:process";
import { HttpError } from "@calcom/lib/http-error";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialForCalendarService, CredentialPayload } from "@calcom/types/Credential";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";
import { z } from "zod";
import { metadata } from "../_metadata";

const FAKE_DIALPAD_CREDENTIAL: CredentialForCalendarService & { invalid: boolean } = {
  id: 0,
  type: metadata.type,
  key: {},
  userId: 0,
  user: { email: "" },
  appId: metadata.slug,
  invalid: false,
  teamId: null,
  encryptedKey: null,
  delegatedToId: null,
  delegatedTo: null,
  delegationCredentialId: null,
};

const dialpadMeetingSchema: z.ZodType<{
  id: string;
  meeting_url: string;
  dial_in_number: string | null;
  participant_pin: string | null;
}> = z.object({
  id: z.string(),
  meeting_url: z.string(),
  dial_in_number: z.string().nullable(),
  participant_pin: z.string().nullable(),
});

type DialpadMeeting = z.infer<typeof dialpadMeetingSchema>;

function dialpadAuthHeader(): { Authorization: string } {
  const apiKey = process.env.DIALPAD_API_KEY;
  if (!apiKey) {
    throw new HttpError({ statusCode: 500, message: "Missing DIALPAD_API_KEY" });
  }
  return { Authorization: `Bearer ${apiKey}` };
}

function getDialpadUserId(): number {
  const raw = process.env.DIALPAD_USER_ID;
  if (!raw) {
    throw new HttpError({
      statusCode: 500,
      message: "Missing DIALPAD_USER_ID (Dialpad API v2 meetings.create requires a user_id)",
    });
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed <= 0) {
    throw new HttpError({ statusCode: 500, message: "Invalid DIALPAD_USER_ID (must be a positive number)" });
  }
  return parsed;
}

async function createDialpadMeeting(event: CalendarEvent): Promise<DialpadMeeting> {
  const res = await fetch("https://dialpad.com/api/v2/meetings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...dialpadAuthHeader(),
    },
    body: JSON.stringify({
      title: event.title,
      user_id: getDialpadUserId(),
      meeting_type: "UNIQUE_MEETING",
      start_datetime: Math.floor(Date.parse(event.startTime) / 1000),
      end_datetime: Math.floor(Date.parse(event.endTime) / 1000),
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (json && typeof json === "object" && "message" in json && json.message) || "Dialpad error";
    throw new HttpError({ statusCode: res.status, message: String(msg) });
  }

  return dialpadMeetingSchema.parse(json);
}

const DialpadVideoApiAdapter = (_credential: CredentialPayload): VideoApiAdapter => {
  return {
    getAvailability: () => Promise.resolve([]),
    createMeeting: async (event: CalendarEvent): Promise<VideoCallData> => {
      const meeting = await createDialpadMeeting(event);
      event.location = meeting.meeting_url;
      const lines: string[] = [
        "Your Dialpad Meetings information is below.",
        "Join the meeting:",
        meeting.meeting_url,
      ];
      if (meeting.dial_in_number) {
        lines.push("", "Dial-in number:", meeting.dial_in_number);
      }
      if (meeting.participant_pin) {
        lines.push("", "PIN:", meeting.participant_pin);
      }
      lines.push("", "International Access Numbers:", "https://meetings.dialpad.com/international");
      const details = lines.join("\n");

      if (event.additionalNotes) {
        event.additionalNotes = `${event.additionalNotes}\n\n${details}`;
      } else {
        event.additionalNotes = details;
      }
      return {
        type: metadata.type,
        id: meeting.id,
        password: meeting.participant_pin ?? "",
        url: meeting.meeting_url,
      };
    },
    deleteMeeting: async (): Promise<void> => Promise.resolve(),
    updateMeeting: async (bookingRef: PartialReference): Promise<VideoCallData> => {
      return {
        type: metadata.type,
        id: String(bookingRef.meetingId ?? ""),
        password: String(bookingRef.meetingPassword ?? ""),
        url: String(bookingRef.meetingUrl ?? ""),
      };
    },
  };
};

export default DialpadVideoApiAdapter;
export { FAKE_DIALPAD_CREDENTIAL };
