import { translate, type MessageKey, type MessageParams, type Message } from './i18n'

// An error meant for the user: carries a message key, translated only when shown.
// `message` holds the English text, so logs and `toThrow` assertions stay readable.
export class AppError extends Error {
  readonly userMessage: Message

  constructor(key: MessageKey, params?: MessageParams) {
    super(translate('en', key, params))
    this.name = 'AppError'
    this.userMessage = { key, params }
  }
}
