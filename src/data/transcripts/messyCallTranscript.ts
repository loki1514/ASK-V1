// A genuinely messy phone call: filler words, interruptions, [OVERLAP],
// [INAUDIBLE] gaps, name corrections, and hedging. The parser normalizes all of
// it into timestamped segments and the semantic extractor pulls the commitments.

export const messyCallTranscript = `[00:00] SPEAKER_A
Okay so... we need to close the... uh... Bangalore site thing before Monday.
[00:07] SPEAKER_B
Yeah, the contractor said the electrical work is almost...
[00:11] SPEAKER_B
...almost done but the panels are still not there.
[00:15] SPEAKER_A
Sorry, I think you're breaking up.
[00:18] SPEAKER_B
No I'm saying panels haven't come.
[00:21] SPEAKER_A
We ordered them last week right?
[00:24] SPEAKER_B
Yeah, I think Rohit ordered it.
[00:27] SPEAKER_A
No, procurement was supposed to do that. I sent the requirement.
[00:32] SPEAKER_A
Okay okay. Someone check the PO.
[00:36] SPEAKER_B
Also the HVAC guy came yesterday and said he'll finish by Friday.
[00:41] SPEAKER_A
Friday? That's too late.
[00:44] SPEAKER_A
[INAUDIBLE 4 sec]
[00:49] SPEAKER_A
We need the ceiling done before that.
[00:52] SPEAKER_B
Yes, but without the ducting we can't close the ceiling.
[00:56] SPEAKER_A
Right.
[00:58] SPEAKER_A
I'll speak to... what's his name... Suresh? ... the contractor.
[01:04] SPEAKER_B
No Suresh is electrical. HVAC is Manoj.
[01:07] SPEAKER_A
Okay Manoj. I'll call Manoj tomorrow morning.
[01:12] SPEAKER_B
And somebody needs to send the revised drawing to the client.
[01:16] SPEAKER_A
I thought design already sent it.
[01:18] SPEAKER_B
Not the revised one. We changed the meeting room.
[01:22] SPEAKER_A
What changed?
[01:24] SPEAKER_B
The partition is moving by about two feet.
[01:27] SPEAKER_A
Okay, then design needs to update the drawing.
[01:31] SPEAKER_B
Who will tell them?
[01:33] SPEAKER_A
I'll send them a message.
[01:36] SPEAKER_B
No, wait, don't send yet. We need to confirm the electrical point first.
[01:40] SPEAKER_A
Right.
[01:43] SPEAKER_A
So basically three things.
[01:45] SPEAKER_A
Panels.
[01:46] SPEAKER_A
HVAC.
[01:47] SPEAKER_A
Drawing.
[01:49] SPEAKER_A
And client meeting is Thursday, correct?
[01:51] SPEAKER_B
Thursday afternoon.
[01:53] SPEAKER_A
Then drawing needs to go before Wednesday.
[01:57] SPEAKER_B
Yeah.
[02:00] SPEAKER_A
Can someone put this in the tracker?
[02:04] SPEAKER_B
I'll do it.
[02:06] SPEAKER_A
Okay.
[02:08] SPEAKER_A
[INAUDIBLE 6 sec]
[02:15] SPEAKER_A
What about the furniture?
[02:18] SPEAKER_B
Furniture is not a blocker yet.
[02:21] SPEAKER_A
Okay leave that.
[02:24] SPEAKER_A
Actually, one more thing. The client asked if we can reduce the workstation count.
[02:29] SPEAKER_B
By how much?
[02:31] SPEAKER_A
I don't know, maybe twenty.
[02:34] SPEAKER_B
Don't commit to that yet.
[02:37] SPEAKER_A
Fine, I'll ask them for confirmation.
[02:40] SPEAKER_B
Okay that's it.`;
