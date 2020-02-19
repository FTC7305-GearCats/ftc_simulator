ssh-copy-id pi@edison
ansible-playbook user-setup.yaml -i hosts
ansible-playbook pi-cleanup.yaml -i hosts --ask-become-pass
ansible-playbook infrastructure.yaml -i hosts --ask-become-pass
ansible-playbook ftc_simulator.yaml -i hosts --ask-become-pass

ssh edison "sqlite3 work/ftc_simulator/data/blocks.db < work/ftc_simulator/src/setup.sql"
