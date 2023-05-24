import { i18n } from "@metro/common";
import { findByName } from "@metro/filters";
import { after } from "@lib/patcher";
import { findInReactTree } from "@lib/utils";
import { getScreens } from "@ui/settings";
import SettingsSection from "@ui/settings/components/SettingsSection";

const screensModule = findByName("getScreens", false);
const settingsModule = findByName("UserSettingsOverviewWrapper", false);

export default function patchPanels() {
    const patches = new Array<Function>;

    // TODO: getScreens is called once, that being when UserSettingsOverview is first rendered.
    // ^ If a plugin adds a screen after this point, navigator will not update accordingly.
    patches.push(after("default", screensModule, (_, existingScreens) => ({
        ...existingScreens,
        ...Object.fromEntries(getScreens().map(s => [s.route, ({
            title: s.label,
            render: s.component,
            ...s.options,
        })])),
    })));

    after("default", settingsModule, (_, ret) => {
        const Overview = findInReactTree(ret.props.children, i => i.type && i.type.name === "UserSettingsOverview");

        // Upload logs button gone
        patches.push(after("renderSupportAndAcknowledgements", Overview.type.prototype, (_, { props: { children } }) => {
            const index = children.findIndex((c: any) => c?.type?.name === "UploadLogsButton");
            if (index !== -1) children.splice(index, 1);
        }));

        // TODO: Rewrite this whole patch, the index hasn't been properly found for months now
        patches.push(after("render", Overview.type.prototype, (_, { props: { children } }) => {
            const titles = [i18n.Messages["BILLING_SETTINGS"], i18n.Messages["PREMIUM_SETTINGS"]];
            //! Fix for Android 174201 and iOS 42188
            children = findInReactTree(children, i => i.children?.[1].type?.name === "FormSection").children;
            const index = children.findIndex((c: any) => titles.includes(c?.props.label));
            children.splice(index === -1 ? 4 : index, 0, <SettingsSection />);
        }));
    }, true);

    return () => patches.forEach(p => p());
}
