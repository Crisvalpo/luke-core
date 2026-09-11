import { HRSource } from '../mirror.types.js';
import { ExcelSource, CSVSource } from './excel.source.js';
import { BukSource } from './buk.source.js';
import { MockSource } from './mock.source.js';

export class SourceFactory {
  private static activeSourceInstance: HRSource | null = null;

  public static getSource(overrideSource?: string): HRSource {
    const requested = (overrideSource || process.env.SOURCE || 'excel').toLowerCase().trim();

    if (this.activeSourceInstance && !overrideSource) {
      return this.activeSourceInstance;
    }

    let source: HRSource;

    switch (requested) {
      case 'buk':
        source = new BukSource();
        break;
      case 'mock':
        source = new MockSource();
        break;
      case 'csv':
        source = new CSVSource();
        break;
      case 'excel':
      default:
        source = new ExcelSource();
        break;
    }

    if (!overrideSource) {
      this.activeSourceInstance = source;
    }

    return source;
  }
}
