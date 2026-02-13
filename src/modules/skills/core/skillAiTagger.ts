import { runAiTaggingBatch, AiTaggingProgressSnapshot } from '../../../common/ai/aiTaggingEngine';
import { SkillConfigManager } from './skillConfigManager';

export class SkillAiTagger {
    constructor(private readonly configManager: SkillConfigManager) {}

    public async run(
        skillNames: string[],
        onProgress?: (snapshot: AiTaggingProgressSnapshot) => Promise<void> | void
    ): Promise<AiTaggingProgressSnapshot> {
        const allSkills = this.configManager.loadAllSkills();
        const selectedSkills = allSkills.filter(skill =>
            skillNames.includes(skill.meta.name) && !!skill.skillMdPath
        );

        const aiConfig = this.configManager.getAiTaggingConfig();
        const result = await runAiTaggingBatch({
            config: aiConfig,
            library: aiConfig.tagLibrary,
            items: selectedSkills.map(skill => ({
                id: skill.meta.name,
                name: skill.meta.name,
                filePath: skill.skillMdPath!
            })),
            onProgress,
            onItemSuccess: async (item, tags) => {
                this.configManager.updateSkillTags(item.filePath, tags);
            }
        });

        return result.snapshot;
    }
}
