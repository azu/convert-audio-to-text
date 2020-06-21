import meow from "meow";
import { convertAudioToText } from "./convert-audio-to-text";

export const cli = meow(
    `
    Usage
      $ convert-audio-to-text [audiofile]
 
    Options
      --output           [path:String] output file path that is written of reported result.

    Examples
      $ convert-audio-to-text ./input.mp3 --output ./output.txt
`,
    {
        flags: {
            output: {
                type: "string",
            },
        },
        autoHelp: true,
        autoVersion: true,
    }
);

export const run = (
    input = cli.input,
    _flags = cli.flags
): Promise<{ exitStatus: number; stdout: string | null; stderr: Error | null }> => {
    const audioFilePath = input[0];
    if (typeof audioFilePath !== "string") {
        throw new Error("should pass audio file path");
    }
    return convertAudioToText({
        audioFilePath: audioFilePath,
    }).then(() => {
        return {
            exitStatus: 0,
            stdout: null,
            stderr: null,
        };
    });
};
