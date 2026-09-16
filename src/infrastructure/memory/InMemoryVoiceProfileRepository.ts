import {
  StoredVoiceTemplate,
  VoiceProfile,
  VoiceProfileRepository,
} from "@/domain/identity/model";

const cloneProfile = (profile: VoiceProfile): VoiceProfile => ({
  ...profile,
  templateIds: [...profile.templateIds],
  centroid: new Float32Array(profile.centroid),
});

const cloneTemplate = (template: StoredVoiceTemplate): StoredVoiceTemplate => ({
  ...template,
  quality: { ...template.quality, reasons: [...template.quality.reasons] },
  embedding: new Float32Array(template.embedding),
});

export class InMemoryVoiceProfileRepository implements VoiceProfileRepository {
  private readonly profiles = new Map<string, VoiceProfile>();
  private readonly templates = new Map<string, StoredVoiceTemplate>();

  async listProfiles(): Promise<VoiceProfile[]> {
    return [...this.profiles.values()].map(cloneProfile);
  }

  async getProfile(id: string): Promise<VoiceProfile | undefined> {
    const profile = this.profiles.get(id);
    return profile ? cloneProfile(profile) : undefined;
  }

  async getTemplates(profileId: string): Promise<StoredVoiceTemplate[]> {
    return [...this.templates.values()]
      .filter((template) => template.profileId === profileId)
      .map(cloneTemplate);
  }

  async saveProfile(profile: VoiceProfile, templates: StoredVoiceTemplate[]): Promise<void> {
    this.profiles.set(profile.id, cloneProfile(profile));
    for (const template of templates) this.templates.set(template.id, cloneTemplate(template));
  }

  async deleteProfile(id: string): Promise<void> {
    this.profiles.delete(id);
    for (const [templateId, template] of this.templates.entries()) {
      if (template.profileId === id) this.templates.delete(templateId);
    }
  }
}

