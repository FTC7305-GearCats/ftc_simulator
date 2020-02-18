ssh-copy-id pi@edison
ansible-playbook user-setup.yaml -i hosts
ansible-playbook pi-cleanup.yaml -i hosts --ask-become-pass
ansible-playbook infrastructure.yaml -i hosts --ask-become-pass
