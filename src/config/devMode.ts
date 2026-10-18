export type DevSettings = {
  mockSttPhrase: string;
  showDevUi: boolean;
};

export const defaultDevSettings: DevSettings = {
  mockSttPhrase: "I'll check the PO status with procurement today and confirm by 5 PM.",
  showDevUi: true,
};

export const isDevModeEnabled = true;
