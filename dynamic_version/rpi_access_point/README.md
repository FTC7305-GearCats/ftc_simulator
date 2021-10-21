ssh-copy-id pi@edison
ansible-playbook user-setup.yaml -i hosts
ansible-playbook pi-cleanup.yaml -i hosts --ask-become-pass
ansible-playbook infrastructure.yaml -i hosts --ask-become-pass
ansible-playbook ftc_simulator.yaml -i hosts --ask-become-pass
ansible-playbook access_point.yaml -i hosts --ask-become-pass



# Set up the database (one time only):

sudo -u www-data sqlite3 /var/www/work/dynamic_version/ftc_simulator/data/blocks.db < ~dwatson/work/dynamic_version/ftc_simulator/src/setup.sql


# To set up the usb console.

https://www.tal.org/tutorials/raspberry-pi-zero-usb-serial-console
