import puppeteer from "puppeteer-core";
import path from "path";

const player = require("play-sound")({});
export type convertAudioToTextOptions = {
    audioLang?: string;
    audioFilePath: string;
};

declare global {
    interface Window {
        log(...args: any[]): void;

        handleRecognized(type: "init"): void;

        handleRecognized(type: "text", value: string): void;

        handleRecognized(type: "start"): void;

        handleRecognized(type: "end"): void;

        handleRecognized(type: "error"): void;
    }
}

export const convertAudioToText = async (options: convertAudioToTextOptions) => {
    // const audioLang = options.audioLang || "ja";
    const audioFilePath = path.resolve(process.cwd(), options.audioFilePath);
    console.log(audioFilePath);
    const customArgs = [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
        "--window-size=0,0",
        "--window-position=0,0",
    ];

    if (process.env["PROXY_SERVER"]) {
        customArgs.push(`--proxy-server=${process.env["PROXY_SERVER"]}`);
    }

    const browser = await puppeteer.launch({
        executablePath: process.env["CHROME_PATH"] ? process.env["CHROME_PATH"] : undefined,
        headless: false,
        args: customArgs,
        ignoreDefaultArgs: ["--mute-audio"],
    });
    const page = await browser.newPage();
    await page.exposeFunction("handleRecognized", (type: string, value?: string) => {
        if (type === "text") {
            console.log(value);
        }
    });
    await page.exposeFunction("log", (...value: any[]) => {
        console.log("[BROWSER]", ...value);
    });

    // load one file
    console.log("audioFilePath", audioFilePath);
    // TODO: should use another player
    const audio = player.play(audioFilePath, function (err: any) {
        if (err && !err.killed) throw err;
    });
    function exitHandler() {
        audio.kill();
    }

    process.on("exit", exitHandler);
    process.on("SIGINT", exitHandler);
    process.on("SIGUSR1", exitHandler);
    process.on("SIGUSR2", exitHandler);
    process.on("uncaughtException", exitHandler);
    // TODO: end handling
    await page
        .evaluate(() => {
            return new Promise((_resolve, _reject) => {
                const init = () => {
                    const SpeechRecognition =
                        window.SpeechRecognition || ((window as any).webkitSpeechRecognition as SpeechRecognition);
                    const recognition = new SpeechRecognition();
                    recognition.continuous = true;
                    recognition.lang = "ja";
                    recognition.onresult = function (event) {
                        window.log("onresult");
                        for (var i = event.resultIndex; i < event.results.length; ++i) {
                            window.log("text", event.results[i][0].transcript);
                            if (event.results[i].isFinal) {
                                window.handleRecognized("text", event.results[i][0].transcript);
                            }
                        }
                    };
                    recognition.onend = function (_event) {
                        window.log("onend");
                        window.handleRecognized("end");
                        init();
                    };
                    recognition.onstart = function (_event) {
                        window.log("onstart");
                        window.handleRecognized("start");
                    };
                    recognition.onerror = function (_event) {
                        window.log("onerror");
                        window.handleRecognized("error");
                        // reject(event);
                    };
                    recognition.start();
                    window.log("init");
                    window.handleRecognized("init");
                };
                init();
            });
        })
        .finally(() => {
            audio.kill();
        });
    await browser.close();
};
