import { runAiTaggingBatch, AiTaggingProgressSnapshot } from '../../../common/ai/aiTaggingEngine';
import { CommandConfigManager } from './commandConfigManager';

export class CommandAiTagger {
    constructor(private readonly configManager: CommandConfigManager) {}

    public async run(
        commandNames: string[],
        onProgress?: (snapshot: AiTaggingProgressSnapshot) => Promise<void> | void
    ): Promise<AiTaggingProgressSnapshot> {
        const allCommands = this.configManager.loadAllCommands();
        const selectedCommands = allCommands.filter(command =>
            commandNames.includes(command.meta.command)
        );

        const aiConfig = this.configManager.getAiTaggingConfig();
        const result = await runAiTaggingBatch({
            config: aiConfig,
            library: aiConfig.tagLibrary,
            items: selectedCommands.map(command => ({
                id: command.meta.command,
                name: command.meta.command,
                filePath: command.path
            })),
            onProgress,
            onItemSuccess: async (item, tags) => {
                this.configManager.updateCommandTags(item.filePath, tags);
            }
        });

        return result.snapshot;
    }
}
