import { Platform } from "react-native";
import { SttProvider } from "./SttProvider";
import { WebSpeechSttProvider } from "./WebSpeechSttProvider";
import { DevPhraseSttProvider } from "./DevPhraseSttProvider";

let defaultProvider: SttProvider | undefined;

export function getDefaultSttProvider(): SttProvider {
  if (!defaultProvider) {
    defaultProvider = Platform.OS === "web" ? new WebSpeechSttProvider() : new DevPhraseSttProvider();
  }
  return defaultProvider;
}

export function setDefaultSttProvider(provider: SttProvider): void {
  defaultProvider = provider;
}
