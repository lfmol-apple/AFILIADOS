export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}

export class EmailProviderNotConfiguredError extends Error {}

export class DisabledEmailProvider implements EmailProvider {
  readonly name = "disabled";

  async send(_message: EmailMessage): Promise<void> {
    throw new EmailProviderNotConfiguredError(
      "Nenhum provedor de e-mail está configurado.",
    );
  }
}

export function getEmailProvider(): EmailProvider {
  return new DisabledEmailProvider();
}
