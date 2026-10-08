import { Checkbox } from '../../../src/components/checkbox/index.js';
import { Switch } from '../../../src/components/switch/index.js';
import { NovaProvider } from '../../../src/providers/nova/index.js';

export default function ToggleScenario() {
  return (
    <NovaProvider>
      <fieldset data-testid="channels">
        <legend>Kênh nhận tin</legend>
        <Checkbox label="Email" name="email" data-testid="cb-email" />
        <Checkbox label="SMS" name="sms" data-testid="cb-sms" />
        <Checkbox label="Thông báo đẩy" name="push" data-testid="cb-push" />
      </fieldset>
      <Checkbox label="Chọn tất cả" defaultValue="mixed" data-testid="cb-mixed" />
      <Checkbox label="Không khả dụng" disabled data-testid="cb-disabled" />
      <Switch label="Chế độ tối" data-testid="switch" />
    </NovaProvider>
  );
}
