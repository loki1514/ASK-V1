import * as SecureStore from "expo-secure-store";
import {
  StoredVoiceTemplate,
  VoiceProfile,
  VoiceProfileRepository,
  VoiceTemplateMetadata,
} from "@/domain/identity/model";

type SerializedProfile = Omit<VoiceProfile, "centroid"> & { centroidBase64: string };
type SerializedTemplate = VoiceTemplateMetadata;

const INDEX_KEY = "ask.voice.index.v1";
const profileKey = (id: string) => `ask.voice.profile.${id}`;
const templateMetadataKey = (id: string) => `ask.voice.template_meta.${id}`;
const templateVectorKey = (id: string) => `ask.voice.template_vector.${id}`;
const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

function bytesToBase64(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const packed = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);
    output += alphabet[(packed >> 18) & 63];
    output += alphabet[(packed >> 12) & 63];
    output += second === undefined ? "=" : alphabet[(packed >> 6) & 63];
    output += third === undefined ? "=" : alphabet[packed & 63];
  }
  return output;
}

function base64ToBytes(value: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = value.replace(/=+$/, "");
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const character of clean) {
    const digit = alphabet.indexOf(character);
    if (digit < 0) throw new Error("Voice template contains invalid base64");
    buffer = (buffer << 6) | digit;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(bytes);
}

function floatArrayToBase64(values: Float32Array): string {
  return bytesToBase64(new Uint8Array(values.buffer, values.byteOffset, values.byteLength));
}

function base64ToFloatArray(value: string): Float32Array {
  const bytes = base64ToBytes(value);
  if (bytes.byteLength % Float32Array.BYTES_PER_ELEMENT !== 0) {
    throw new Error("Voice template byte length is invalid");
  }
  const copy = bytes.slice();
  return new Float32Array(copy.buffer);
}

async function readIndex(): Promise<string[]> {
  const value = await SecureStore.getItemAsync(INDEX_KEY, options);
  if (!value) return [];
  const parsed = JSON.parse(value);
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
}

export class SecureStoreVoiceProfileRepository implements VoiceProfileRepository {
  async listProfiles(): Promise<VoiceProfile[]> {
    const ids = await readIndex();
    const profiles = await Promise.all(ids.map((id) => this.getProfile(id)));
    return profiles.filter((profile): profile is VoiceProfile => Boolean(profile));
  }

  async getProfile(id: string): Promise<VoiceProfile | undefined> {
    const value = await SecureStore.getItemAsync(profileKey(id), options);
    if (!value) return undefined;
    const parsed = JSON.parse(value) as SerializedProfile;
    const { centroidBase64, ...profile } = parsed;
    return {
      ...profile,
      centroid: base64ToFloatArray(centroidBase64),
    };
  }

  async getTemplates(profileId: string): Promise<StoredVoiceTemplate[]> {
    const profile = await this.getProfile(profileId);
    if (!profile) return [];

    const templates = await Promise.all(profile.templateIds.map(async (id) => {
      const [metadataValue, vectorValue] = await Promise.all([
        SecureStore.getItemAsync(templateMetadataKey(id), options),
        SecureStore.getItemAsync(templateVectorKey(id), options),
      ]);
      if (!metadataValue || !vectorValue) return undefined;
      return {
        ...(JSON.parse(metadataValue) as SerializedTemplate),
        embedding: base64ToFloatArray(vectorValue),
      };
    }));

    return templates.filter((template): template is StoredVoiceTemplate => Boolean(template));
  }

  async saveProfile(profile: VoiceProfile, templates: StoredVoiceTemplate[]): Promise<void> {
    if (profile.centroid.length > 192 || templates.some((template) => template.embedding.length > 192)) {
      throw new Error("SecureStore Phase 1 supports at most 192-dimensional speaker embeddings");
    }
    const { centroid, ...profileWithoutCentroid } = profile;
    const serialized: SerializedProfile = {
      ...profileWithoutCentroid,
      centroidBase64: floatArrayToBase64(centroid),
    };
    await SecureStore.setItemAsync(profileKey(profile.id), JSON.stringify(serialized), options);

    for (const template of templates) {
      const { embedding, ...metadata } = template;
      await Promise.all([
        SecureStore.setItemAsync(templateMetadataKey(template.id), JSON.stringify(metadata), options),
        SecureStore.setItemAsync(templateVectorKey(template.id), floatArrayToBase64(embedding), options),
      ]);
    }

    const ids = await readIndex();
    if (!ids.includes(profile.id)) {
      await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify([...ids, profile.id]), options);
    }
  }

  async deleteProfile(id: string): Promise<void> {
    const profile = await this.getProfile(id);
    for (const templateId of profile?.templateIds ?? []) {
      await Promise.all([
        SecureStore.deleteItemAsync(templateMetadataKey(templateId), options),
        SecureStore.deleteItemAsync(templateVectorKey(templateId), options),
      ]);
    }
    await SecureStore.deleteItemAsync(profileKey(id), options);
    const ids = await readIndex();
    await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(ids.filter((item) => item !== id)), options);
  }
}
