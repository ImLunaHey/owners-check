import core from '@actions/core';
import CodeOwners from 'codeowners';
import { context, getOctokit } from '@actions/github';
import { getChangedFilesForRoots } from 'jest-changed-files';
import { outdent } from 'outdent';

const main = async () => {
    try {
        const token = process.env.GITHUB_TOKEN || core.getInput('token');
        if (!token) throw new Error('token not specified');
        console.info('Found Github token', { token });

        const octokit = getOctokit(token);

        const addReviewers = async (prNumber: number, reviewers: string[]) => {
            await octokit.rest.pulls.requestReviewers({
                ...context.repo,
                pull_number: prNumber,
                reviewers,
            });
        };

        // Workspace directory
        const workspaceDirectory = process.env.GITHUB_WORKSPACE;
        if (!workspaceDirectory) throw new Error('No workspace');
        console.info('Found workspace directory', { workspaceDirectory });

        // PR number
        const prNumber = context.payload.pull_request?.number;
        if (!prNumber) throw new Error('No PR number');
        console.info('Found PR number', { prNumber });

        // Get code owner of files
        const codeOwners = new CodeOwners(workspaceDirectory);

        // Get all files that were changed since last commit
        const { changedFiles } = await getChangedFilesForRoots([workspaceDirectory], {
            changedSince: context.sha
        });
        console.info('Files changed since last commit', { changedFiles });

        // Get the owner of each file
        const owners: Record<string, string[]> = {};
        const files: Record<string, string[]> = {};
        for (const filePath of changedFiles.values()) {
            // Create list of owners of this file
            if (!files[filePath]) files[filePath] = [];
            for (const owner of codeOwners.getOwner(filePath)) {
                if (!owners[owner]) {
                    // Create list of files this owner owns
                    owners[owner] = [];
                }
                // Add file to owners list
                (owners[owner] as string[]).push(filePath);
                // Add owner to the files list
                (files[filePath] as string[]).push(owner);
            }
        }
        console.info('Found owners of files', { owners, files });

        // Get the minimum set of reviewers we need
        const uncoveredFiles = new Set(Object.keys(files));
        const minSetOfPeople = new Set<string>();
        while (uncoveredFiles.size > 0) {
            let maxCover = 0;
            let bestPerson: string | null = null;

            for (const [person, files] of Object.entries(owners)) {
                const uncoveredOwnedFiles = files.filter(file => uncoveredFiles.has(file));
                if (uncoveredOwnedFiles.length > maxCover) {
                    maxCover = uncoveredOwnedFiles.length;
                    bestPerson = person;
                }
            }

            if (bestPerson) {
                minSetOfPeople.add(bestPerson);
                owners[bestPerson].forEach(file => uncoveredFiles.delete(file));
            }
        }
        console.info('Found minimum needed owners', { minSetOfPeople });

        // Auto add reviewers to PR
        if (core.getInput('auto-add-reviewers')) {
            console.info('Attempting to add reviewers', { minSetOfPeople });
            await addReviewers(prNumber, [...minSetOfPeople.values()]);
            console.info('Automatically added reviewers', { minSetOfPeople });
        }

        // Comment with who owns which files
        console.info('Adding comment');
        const comment = await octokit.rest.issues.createComment({
            ...context.repo,
            issue_number: prNumber,
            body: outdent`
                | Owner | FilePath |
                |-------|----------|
                ${[...minSetOfPeople.values()].map(owner => `|${owner}|\`\`\`${owners[owner].join(', ')}\`\`\`|`)}
            `,
        });
        console.info('Comment added', { comment });
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error(error.message);
            core.setFailed(error.message);
        }
    }
};

void main();
